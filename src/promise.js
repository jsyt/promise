
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
  let called = false;
  if(x != null && (typeof x === 'object' || typeof x === 'function')){    // 2.3.3  if x is an object or function,
    try {
      let then = x.then;    // 2.3.3.1 Let then be x.then
      if(typeof then === 'function'){  // 2.3.3.3 If then is a function, call it with x as self, first argument resolvePromise, and second argument rejectPromise, where:
        then.call(x, y=>{
          if(called) return;
          called = true;
          resolvePromise(promise2, y, resolve, reject)  // 2.3.3.3.1 If/when resolvePromise is called with a value y, run [[Resolve]](promise, y)
        }, reason=>{
          if(called) return;
          called = true;
          reject(reason)
        })  // 2.3.3.3.2 If/when rejectPromise is called with a reason r, reject promise with r.
      }else{  // 2.3.3.4 If then is not a function, fulfill promise with x.
        resolve(x)
      }
      
    } catch (e) {  // 2.3.3.2 If retrieving the property x.then results in a thrown exception e, reject promise with e as the reason.
      if(called) return;
      called = true;
      reject(e)
    }
    
  }else{  // 2.3.4 If x is not an object or function, fulfill promise with x.
    resolve(x)
  }

}

Promise.prototype.then = function(onFulfilled, onRejected){
  const self = this;
  onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
  onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }

  let promise2 = new Promise(function(resolve, reject){
    if(self.state === PENDING){
        self.resolveCallback.push(()=>{
          setTimeout(() => {
            try {
              let x = onFulfilled(self.value)
              resolvePromise(promise2, x, resolve, reject)
            } catch (e) {
              reject(e)
            }
          }, 0)
        });
        self.rejectCallback.push(()=>{
          setTimeout(() => {
            try {
              let x = onRejected(self.reason)
              resolvePromise(promise2, x, resolve, reject)
            } catch (e) {
              reject(e)
            }
          }, 0);
        });
    }else if(self.state === FULFILLED){
        setTimeout(() => {
          try {
            let x = onFulfilled(self.value)
            resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        }, 0);
    }else if(self.state === REJECTED){
        setTimeout(() => {
          try {
            let x = onRejected(self.reason)
            resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        }, 0);
    }
  })
  return promise2
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