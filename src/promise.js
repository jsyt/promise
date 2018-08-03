
const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

function Promise (executor) {
  const self = this;
  self.state = PENDING;
  self.value = null;
  self.reason = null;
  self.resolveCallback = [];    //成功回调函数队列
  self.rejectCallback = [];    //失败回调函数队列
  function resolve (value){
    if(self.state === PENDING) {
      self.state = FULFILLED;
      self.value = value;
      self.resolveCallback.forEach(cb => {
        cb()
      });
    }
  }

  function reject(reason) {
    if(self.state === PENDING) {
      self.state = REJECTED;
      self.reason = reason;
      self.rejectCallback.forEach(cb => {
        cb()
      })
    }
  }
  try {
    executor(resolve, reject)
  } catch (e) {
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

Promise.prototype.catch = function(onRejected){
  return this.then(null, onRejected)
}

Promise.resolve = function(value){
  return new Promise((resolve, reject)=>{
    resolve(value)
  })
}

Promise.reject = function(reason){
  return new Promise((resolve, reject)=>{
    reject(reason)
  })
}

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

Promise.race = function(arr){
  return new Promise((resolve, reject)=>{
    arr.forEach((promise, i)=>{
      promise.then(resolve, reject);
    })
  })
}

Promise.deferred = Promise.defer = function(){
  let defer = {};
  defer.promise = new Promise((resolve, reject)=>{
    defer.resolve = resolve;
    defer.reject = reject;
  })
  return defer;
}

module.exports = Promise;