let indexExists = false;

const _isValidIndexObject = (index) => {
  // If no index argument is provided
  // OR if the provided argument isn't an object (cannot be an array)
  // OR if the object doesn't have an 'index' key
  // OR if the key has no value...
  return !!index || (typeof index === 'object' && (index instanceof Array)) || index.hasOwnProperty('index') || !index.index === undefined;
}

const create = async (index) => {
  if (!_isValidIndexObject(index)) {
    throw new Error('ConfigurationError: Missing required parameter: index');
  }

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
  if (!_isValidIndexObject(index)) {
    throw new Error('ConfigurationError: Missing required parameter: index');
  }

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
  if (!_isValidIndexObject(index)) {
    throw new Error('ConfigurationError: Missing required parameter: index');
  }

  if (!indexExists) {
    return {
      body: false,
      statusCode: 404
    };
  }

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

  // If the value of the body.body is not an array
  // OR if it contains an odd number of items
  // OR not all even numbered array items look like {index: {_index:'test'}, ...}
  if (!(body.hasOwnProperty('body') && Array.isArray(body.body))
    || body.body.length % 2 !== 0
    || body.body.filter(_filterBadBulkItems).length > 0
  ) {
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

const refresh = async () => {

  return {
    body: { _shards: { total: 2, successful: 2, failed: 0 } },
    statusCode: 200
  }
};

const search = async (keyword, index) => {

  if (!indexExists) {
    throw new Error('ResponseError: index_not_found_exception');
  }

  return {
    body: {
      took: 3,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: {
        total: { value: 1, relation: 'eq' },
        max_score: 0.90204775,
        hits:  [
          {
            _index: 'job-bank-en',
            _source: {
              jobs_id: '30999896',
              title: 'education outreach program co-ordinator'
            }
          }
        ]
      }
    },
    statusCode: 200
  };
};

function EsMock() {
  console.log('Mock Elasticsearch Client in use');
}

EsMock.prototype = {
  indices: {
    create: create,
    delete: del,
    exists: exists,
    refresh: refresh
  },
  bulk: bulk,
  search: search
};

module.exports.Client = EsMock;
