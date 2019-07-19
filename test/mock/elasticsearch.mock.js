let indexExists = false;

//TODO: create a function to run the initial argument verification in all functions

const create = async (index) => {
  // If no index argument is provided
  // OR if the provided argument isn't an object (cannot be an array)
  // OR if the object doesn't have an 'index' key
  // OR if the key has no value...
  if (!index || !(typeof index === 'object' && !(index instanceof Array)) || !index.hasOwnProperty('index') || index.index === undefined) {
    throw new Error('ConfigurationError: Missing required parameter: index');
  }
  //If index already exist
  if (indexExists) {
    throw new Error('ResponseError: resource_already_exists_exception');
  }

  // Otherwise, when conditions are met, 'create' index and return successful response object

  indexExists = true;

  return {
    body: {
      acknowledged: true,
      shards_acknowledged: true,
      index: index.index
    },
    statusCode: 200
  };
};

const del = async (index) => {
  // If no index argument is provided
  // OR if the provided argument isn't an object (cannot be an array)
  // OR if the object doesn't have an 'index' key
  // OR if the key has no value...
  if (!index || !(typeof index === 'object' && !(index instanceof Array)) || !index.hasOwnProperty('index') || index.index === undefined) {
    throw new Error('ConfigurationError: Missing required parameter: index');
  }
  // If the index doesn't exist
  if (!indexExists) {
    throw new Error('ResponseError: index_not_found_exception');
  }

  // Otherwise, when conditions are met, 'delete' index and return successful response object

  indexExists = false;

  return {
    body: { acknowledged: true },
    statusCode: 200
  };
};

const exists = async (index) => {
  // If no index argument is provided
  // OR if the provided argument isn't an object (cannot be an array)
  // OR if the object doesn't have an 'index' key
  // OR if the key has no value...
  if (!index || !(typeof index === 'object' && !(index instanceof Array)) || !index.hasOwnProperty('index') || index.index === undefined) {
    throw new Error('ConfigurationError: Missing required parameter: index');
  }
  // If index does not exist...
  if (!indexExists) {
    return {
      body: false,
      statusCode: 404
    };
  }

  // If it does exist...
  return {
    body: true,
    statusCode: 200
  };
};

const _filterBadBulkItems = (item, index) => {
  // all even numbered array items must look like {index: {_index:'test'}, ...}
  return index % 2 === 0 && (!item.hasOwnProperty('index') || !item.index.hasOwnProperty('_index'));
};

const bulk = async (body) => {
  // If no body argument is provided
  // OR if the provided argument isn't an object (cannot be an array)
  // OR if the object doesn't have a 'body' key...
  if (!body || !(typeof body === 'object' && !(body instanceof Array)) || !body.hasOwnProperty('body')) {
    throw new Error('ConfigurationError: Missing required parameter: body');
  }

  // The value of the body.body key needs to be an array
  // AND it needs to contain an odd number of items
  // AND all even numbered array items must look like {index: {_index:'test'}, ...}
  if (!(body.hasOwnProperty('body') && Array.isArray(body.body))
    // || body.body.length % 2 !== 0
    // || body.body.filter(_filterBadBulkItems)
  ) {
    console.log('causght me')
    throw new Error('Error saving in bulk: illegal_argument_exception');
  }

  // If all good, return a success object
  return {
    body: {
      took: 88,
      errors: false,
      items: [ [Object], [Object], [Object], [Object] ]
    },
    statusCode: 200
  };
};

function EsMock() {
  console.log('Mock Elasticsearch Client in use');
};

EsMock.prototype = {
  indices: {
    create: create,
    delete: del,
    exists: exists
  },
  bulk: bulk
};

module.exports.Client = EsMock;
