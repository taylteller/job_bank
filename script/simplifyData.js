const simplifyData = (item) => {
  if (Array.isArray(item)) {
    return simplifyArray(item);
  }

  if (typeof item === 'object' && !(item instanceof Array)) {
    return simplifyObject(item);
  }

  return item;
};

const simplifyArray = (arr) => {
  if (arr.length === 0) {
    return null;
  }

  if (arr.length === 1) {
    return simplifyData(arr[0]);
  }

  return arr.map((x) => simplifyData(x));
};

const simplifyObject = (obj) => {
  const keys = Object.keys(obj);

  if (keys.length === 0) {
    return null;
  }

  if (keys.length === 1) {
    return simplifyData(obj[keys[0]]);
  }

  return keys.reduce((accumulator, currentKey) => {
    accumulator[currentKey] = simplifyData(obj[currentKey]);
    return accumulator;
  }, {});
};

module.exports = simplifyData;
module.exports._simplifyArray = simplifyArray;
module.exports._simplifyObject = simplifyObject;
