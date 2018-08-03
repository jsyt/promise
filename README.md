# promise
模拟实现一个符合[Promise A+规范](https://promisesaplus.com/)的promise，仅供学习其实现原理

promise的详细使用方法可参考[阮一峰老师的文章](http://es6.ruanyifeng.com/#docs/promise)

## [Promise A+规范](https://promisesaplus.com/)概述

### promise雏形

简单点说
1. `promise` 函数的参数（executor）是一个函数，这个函数有两个参数`resolve`和`reject`，这两个参数也都是函数，分别在`promise`成功和失败时调用。

2. 当构建一个`promise`实例时，会自动调用这个函数（executor）
3. 每个`promise` 对象都有一个`onFulfilledCallback`队列和一个`onRejectedCallback`队列，用来分别存储成功和失败时调用的回调函数
4. 每个`promise`有三种状态`pending` 、`fulfilled`、`rejected`，同一时刻只能处于其中一种状态，并且只能从`pending` 、状态转化成`fulfilled`状态，或者`rejected`状态，一旦状态发生转化就不能再被改变。
5. 当调用`resolve(value)`函数时，`promise`的状态会从`pending`转化成`fulfilled`，并且将`resolve`参数中的`value`值赋值给此`promise`的`value`变量，promise的`value`被赋值后，就不能再次改变了；此时还会去取出`onFulfilledCallback`队列中所有的回调函数，并将此`promise`的`value`作为回调函数的参数，依次执行
6. 当调用`rejected(reason)`函数时，`promise`的状态会从`pending`转化成`rejected`，并且将`rejected(reason)`函数中的`reason`参数赋值给此`promise`的`reason`变量，这个`reason`被赋值后，也是不能再次改变了；此时还会去取出`onRejectedCallback`队列中所有的回调函数，并将此`promise`的`reason`作为回调函数的参数，依次执行
7. 当executor执行抛异常时捕获这个异常，并将异常的原因作为`reject`函数的参数，执行`reject`函数

根据这些我们先写一个第一版的promise

```js
function Promise(executor) {
  const self = this;
  self.state = 'pending';
  self.value = null;
  self.reason = null;
  self.onFulfilledCallback = [];
  self.onRejectedCallback = [];

  function resolve(value) {
    if(self.state === 'pending'){
      self.state = 'fulfilled';
      self.value = value;
      self.onFulfilledCallback.foreach(fn=>fn(self.value))
    }
  }

  function reject(reason) {
    if(self.state === 'pending'){
      self.state = 'rejected';
      self.reason = reason;
      self.onRejectedCallback.foreach(fn=>fn(self.reason))
    }
  }

  try{
    executor(resolve, reject)
  }catch(e){
    reject(e)
  }
  
  
}
```
### promise.then
1. 每个`promise`必须提供一个`then`方法，并且`then`方法包含两个参数`onFulfilled` 和 `onRejected`
2. 这两个参数如果不是函数的话就直接忽略，并且将成功或失败的值传递给下一个then注册的回调函数及下一个then的`onFulfilled` 和 `onRejected`
3. 当执行then函数时，如果promise的状态是`pending`则将then中注册的成功和失败时对应的回调函数`onFulfilled` 和 `onRejected`分别放入onFulfilledCallback队列和一个onRejectedCallback队列中
4. 如果promise的状态是`fulfilled`，就直接调用`onFulfilled`函数，并且将此`promise`的`value`作为`onFulfilled`函数的第一个参数执行
5. 如果`promise`的状态为`rejected`，就直接调用`onRejected`函数，并且将此`promise`的`reason`作为`onRejected`函数的第一个参数执行

```js
Promise.prototype.then = function (onFulfilled, onRejected) {
  const self = this;
  onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : val => val;
  onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err };
  if(self.state === 'fulfilled'){
    onFulfilled(self.value);
  }else if(self.state === 'rejected'){
    onRejected(self.reason);
  }else if(self.state === 'pending'){
    self.onFulfilledCallback.push(onFulfilled);
    self.onRejectedCallback.push(onRejected);
  }
}
```

### promise 链式调用
1. 此时的promise 是不支持链式调用的，所以我们应该在then中返回一个新的promise来支持链式调用
为什么是新的promise，而不是直接返回this呢？
因为promise的状态一旦发生转变，就不能再次改变了，而链式调用中的then返回的promise是可以选择resolve或者reject的，所以then必须返回一个新的promise
2. 所有的then中注册的回调函数，都应该是异步执行，标准promise的then中注册的回调函数是属于微观任务，我们这里可以用setTimeout来模拟，但是要注意的是setTimeout属于宏观任务
3. 所有的then中注册的异步回调函数都应该放在try{}catch中执行，当执行then 中的回调函数抛出异常时，应该捕获这个异常，并将异常对象传递给reject，并调用reject

```js
Promise.prototype.then = function (onFulfilled, onRejected) {
  const self = this;
  return new Promise((resolve, reject) => {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : val => val;
    onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err };
    if(self.state === 'fulfilled'){
      setTimeout(()=>{
        try{
          onFulfilled(self.value);
        }catch(e){
          reject(e)
        }
      }, 0)
    }else if(self.state === 'rejected'){
      setTimeout(()=>{
        try{
          onRejected(self.reason);
        }catch(e){
          reject(e)
        }
      }, 0)
    }else if(self.state === 'pending'){
      self.onFulfilledCallback.push(()=>{
        setTimeout(()=>{
          try{
            onFulfilled(self.value);
          }catch(e){
            reject(e)
          }
        }, 0)
      }));
      self.onRejectedCallback.push(()=>{
        setTimeout(()=>{
        try{
          onRejected(self.reason);
        }catch(e){
          reject(e)
        }
      }, 0)
      }));
    }
  })
}
```

### 嵌套promise问题

```js
let promise1 = new Promise((resolve, reject)=>{
  setTimeout(()=>{
    resolve(new Promise((resolve, reject)=>{
      setTimeout(()=>{
        resolve(new Promise((resolve, reject)=>{
          setTimeout(()=>{
            resolve('666')
          }, 0)
        }))
      }, 0)
    }))
  }, 0)
})

let promise2 = promise1.then((value)=>{
  console.log(value) //666
})

```
我们知道当调用resolve(value)时，如果resolve中的参数value是一个普通值，则会将value传递给then中注册的成功时的回调函数，并调用此回调函数。但是如果value不是一个普通值，而是一个promise的话，则会执行这个promise，如果执行这个promise得到的结果仍然为一个promise，则继续递归执行，直到最终执行结果为一个普通值，并且将这个执行结果作为第一个promise的执行结果，Promise A+ 规范定义了这个解析流程

![](static/resolvePromise.png)


```js
function resolvePromise(promise2, x, resolve, reject) {
  if(promise2 === x) {   //2.3.1 If promise and x refer to the same object, reject promise with a TypeError as the reason.
    return reject(new TypeError('circular reference'));
  }
  let called = false;  // 2.3.3.3.3 If both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made, the first call takes precedence, and any further calls are ignored.
  if(x != null && (typeof x === 'object' || typeof x === 'function')){    // 2.3.3  if x is an object or function,
    try {
      let then = x.then;    // 2.3.3.1 Let then be x.then
      if(typeof then === 'function'){  // 2.3.3.3 If then is a function, call it with x as self, first argument resolvePromise, and second argument rejectPromise, where:
        then.call(x, y=>{
          if(called) return;   // 2.3.3.3.4.1 If resolvePromise or rejectPromise have been called, ignore it.
          called = true;
          resolvePromise(promise2, y, resolve, reject)  // 2.3.3.3.1 If/when resolvePromise is called with a value y, run [[Resolve]](promise, y)
        }, reason=>{
          if(called) return;  // 2.3.3.3.4.1 If resolvePromise or rejectPromise have been called, ignore it.
          called = true;
          reject(reason)  // 2.3.3.3.2 If/when rejectPromise is called with a reason r, reject promise with r.
        })
      }else{  // 2.3.3.4 If then is not a function, fulfill promise with x.
        resolve(x)
      }
    } catch (e) {  // 2.3.3.2 If retrieving the property x.then results in a thrown exception e, reject promise with e as the reason.
      if(called) return;  // 2.3.3.3.4.1 If resolvePromise or rejectPromise have been called, ignore it.
      called = true;
      reject(e)  // 2.3.3.3.4.2 Otherwise, reject promise with e as the reason
    }
  }else{  // 2.3.4 If x is not an object or function, fulfill promise with x.
    resolve(x)
  }

}

Promise.prototype.then = function(onFulfilled, onRejected){
  const self = this;
  // 2.2.1 Both onFulfilled and onRejected are optional arguments:
  onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
  onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }

  let promise2 = new Promise(function(resolve, reject){
    if(self.state === PENDING){
        self.resolveCallback.push(()=>{
          setTimeout(() => {
            try {
              let x = onFulfilled(self.value)
              resolvePromise(promise2, x, resolve, reject)  // 2.2.7.1 If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x).
            } catch (e) {
              reject(e)  // 2.2.7.2 If either onFulfilled or onRejected throws an exception e, promise2 must be rejected with e as the reason.
            }
          }, 0)
        });
        self.rejectCallback.push(()=>{
          setTimeout(() => {
            try {
              let x = onRejected(self.reason)
              resolvePromise(promise2, x, resolve, reject)  // 2.2.7.1 If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x).
            } catch (e) {
              reject(e)  // 2.2.7.2 If either onFulfilled or onRejected throws an exception e, promise2 must be rejected with e as the reason.
            }
          }, 0);
        });
    }else if(self.state === FULFILLED){  // 2.2.6.1 If/when promise is fulfilled, all respective onFulfilled callbacks must execute in the order of their originating calls to then.
        setTimeout(() => {
          try {
            let x = onFulfilled(self.value)  // 2.2.2.1 it must be called after promise is fulfilled, with promise’s value as its first argument.
            resolvePromise(promise2, x, resolve, reject)  // 2.2.7.1 If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x).
          } catch (e) {
            reject(e)  // 2.2.7.2 If either onFulfilled or onRejected throws an exception e, promise2 must be rejected with e as the reason.
          }
        }, 0);
    }else if(self.state === REJECTED){  // 2.2.6.2 If/when promise is rejected, all respective onRejected callbacks must execute in the order of their originating calls to then.
        setTimeout(() => {
          try {
            let x = onRejected(self.reason)
            resolvePromise(promise2, x, resolve, reject)  // 2.2.7.1 If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x).
          } catch (e) {
            reject(e)  // 2.2.7.2 If either onFulfilled or onRejected throws an exception e, promise2 must be rejected with e as the reason.
          }
        }, 0);
    }
  })
  return promise2;  // 2.2.7 then must return a promise
}
```

### 整理一下，最终版本

```js
function Promise(executor) {
  const self = this;
  self.state = 'pending';
  self.value = null;
  self.reason = null;
  self.onFulfilledCallback = [];
  self.onRejectedCallback = [];

  function resolve(value) {
    if(self.state === 'pending'){
      self.state = 'fulfilled';
      self.value = value;
      self.onFulfilledCallback.forEach(fn=>fn())
    }
  }

  function reject(reason) {
    if(self.state === 'pending'){
      self.state = 'rejected';
      self.reason = reason;
      self.onRejectedCallback.forEach(fn=>fn())
    }
  }

  try{
    executor(resolve, reject)
  }catch(e){
    reject(e)
  }
}


function resolvePromise(promise2, x, resolve, reject) {
  if(promise2 === x) {   //2.3.1 If promise and x refer to the same object, reject promise with a TypeError as the reason.
    return reject(new TypeError('circular reference'));
  }
  let called = false;  // 2.3.3.3.3 If both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made, the first call takes precedence, and any further calls are ignored.
  if(x != null && (typeof x === 'object' || typeof x === 'function')){    // 2.3.3  if x is an object or function,
    try {
      let then = x.then;    // 2.3.3.1 Let then be x.then
      if(typeof then === 'function'){  // 2.3.3.3 If then is a function, call it with x as self, first argument resolvePromise, and second argument rejectPromise, where:
        then.call(x, y=>{
          if(called) return;   // 2.3.3.3.4.1 If resolvePromise or rejectPromise have been called, ignore it.
          called = true;
          resolvePromise(promise2, y, resolve, reject)  // 2.3.3.3.1 If/when resolvePromise is called with a value y, run [[Resolve]](promise, y)
        }, reason=>{
          if(called) return;  // 2.3.3.3.4.1 If resolvePromise or rejectPromise have been called, ignore it.
          called = true;
          reject(reason)  // 2.3.3.3.2 If/when rejectPromise is called with a reason r, reject promise with r.
        })
      }else{  // 2.3.3.4 If then is not a function, fulfill promise with x.
        resolve(x)
      }
    } catch (e) {  // 2.3.3.2 If retrieving the property x.then results in a thrown exception e, reject promise with e as the reason.
      if(called) return;  // 2.3.3.3.4.1 If resolvePromise or rejectPromise have been called, ignore it.
      called = true;
      reject(e)  // 2.3.3.3.4.2 Otherwise, reject promise with e as the reason
    }
  }else{  // 2.3.4 If x is not an object or function, fulfill promise with x.
    resolve(x)
  }

}

Promise.prototype.then = function(onFulfilled, onRejected){
  const self = this;
  // 2.2.1 Both onFulfilled and onRejected are optional arguments:
  onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
  onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }

  let promise2 = new Promise(function(resolve, reject){
    if(self.state === PENDING){
        self.resolveCallback.push(()=>{
          setTimeout(() => {
            try {
              let x = onFulfilled(self.value)
              resolvePromise(promise2, x, resolve, reject)  // 2.2.7.1 If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x).
            } catch (e) {
              reject(e)  // 2.2.7.2 If either onFulfilled or onRejected throws an exception e, promise2 must be rejected with e as the reason.
            }
          }, 0)
        });
        self.rejectCallback.push(()=>{
          setTimeout(() => {
            try {
              let x = onRejected(self.reason)
              resolvePromise(promise2, x, resolve, reject)  // 2.2.7.1 If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x).
            } catch (e) {
              reject(e)  // 2.2.7.2 If either onFulfilled or onRejected throws an exception e, promise2 must be rejected with e as the reason.
            }
          }, 0);
        });
    }else if(self.state === FULFILLED){  // 2.2.6.1 If/when promise is fulfilled, all respective onFulfilled callbacks must execute in the order of their originating calls to then.
        setTimeout(() => {
          try {
            let x = onFulfilled(self.value)  // 2.2.2.1 it must be called after promise is fulfilled, with promise’s value as its first argument.
            resolvePromise(promise2, x, resolve, reject)  // 2.2.7.1 If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x).
          } catch (e) {
            reject(e)  // 2.2.7.2 If either onFulfilled or onRejected throws an exception e, promise2 must be rejected with e as the reason.
          }
        }, 0);
    }else if(self.state === REJECTED){  // 2.2.6.2 If/when promise is rejected, all respective onRejected callbacks must execute in the order of their originating calls to then.
        setTimeout(() => {
          try {
            let x = onRejected(self.reason)
            resolvePromise(promise2, x, resolve, reject)  // 2.2.7.1 If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x).
          } catch (e) {
            reject(e)  // 2.2.7.2 If either onFulfilled or onRejected throws an exception e, promise2 must be rejected with e as the reason.
          }
        }, 0);
    }
  })
  return promise2;  // 2.2.7 then must return a promise
}


module.exports = Promise;
```

### 测试

#### 安装promises-aplus-tests

```
npm i -g promises-aplus-tests
```

#### 添加测试代码
```js
Promise.deferred = Promise.defer = function(){
  let defer = {};
  defer.promise = new Promise((resolve, reject)=>{
    defer.resolve = resolve;
    defer.reject = reject;
  })
  return defer;
}
```


#### 测试命令

```
promises-aplus-tests promise.js
```

#### 测试结果(872 passing)

![测试结果](static/promiseTest.png)


## Promise 其他常用方法实现

### Promise.resolve
```js
Promise.resolve = function(value){
  return new Promise((resolve, reject)=>{
    resolve(value)
  })
}
```

### Promise.reject
```js
Promise.reject = function(reason){
  return new Promise((resolve, reject)=>{
    reject(reason)
  })
}
```

### promise.catch

```js
Promise.prototype.catch = function(onRejected){
  return this.then(null, onRejected)
}
```

### Promise.all

```js
Promise.all = function(arr){
  let index = 0;
  let result = []
  return new Promise((resolve, reject)=>{
    arr.forEach((promise, i)=>{
      promise.then(val=>{
        result[i] = val
        if(++index === arr.length) {  // 由于then注册的回调函数是异步执行的，无法确定回调函数什么时候执行完成，所以必须得把判断放到回调函数中，这样才能确保所有的异步任务执行完成后在调用resolve
          resolve(result)
        }
      }, reject);
    })
  })
}
```

### Promise.race
```js
Promise.race = function(arr){
  return new Promise((resolve, reject)=>{
    arr.forEach((promise, i)=>{
      promise.then(resolve, reject);
    })
  })
}
```