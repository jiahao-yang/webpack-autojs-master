/**
 * Autox.js will be used in this script
 */

const callBack = () => {
  console.log('Callback function is called');
  return new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve('Callback function is resolved');
        reject('Callback function is rejected');
    }, 1000);
  });
};

/** 
callBack()
  .then((result) => {
    toastLog(result)
  })
  .catch((error) => {
    toastLog(error)
  });
*/

const getResult = async () => {
  try {
    const result = await callBack();
    toastLog("result Why error!!!" + result);
  } catch (error) {
    toastLog(error);
  }
};


getResult();
