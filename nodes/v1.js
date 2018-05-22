/**
 * Copyright 2017 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
  var ibmdb = require('ibm_db');
  //var settings = require('./settings');

  function start(msg, config) {
    var query = null;
    if (!msg.payload) {
      return Promise.reject('Missing property: msg.payload');
    } else if ('string' === typeof msg.payload){
      query = msg.payload;
    } else if (config.query && ('string' === typeof config.query)) {
      query = config.query;
    }
    //console.log('Input Type is :', typeof msg.payload);
    return Promise.resolve(query);
  }

  function checkForParameters(msg, config) {
    var response = [];
    var qps = '';

    if (config.params && config.params != null) {
      qps = config.params;
    } else if (msg.queryparams && ('string' === typeof msg.queryparams)) {
      qps = msg.queryparams;
    }
    if (qps) {
      response = qps.split(',').map(function(i) {
        return i.trim();
      });

    }
    return Promise.resolve(response);
  }

  function determineConnectionString(connectionNode) {
    //var connString = settings.dbConnectionString();

    if (!connectionNode) {
      return Promise.reject('No Configuration Found');
    }

    var connString = "DRIVER={DB2};DATABASE=" + connectionNode.db +
                   ";UID=" + connectionNode.username +
                   ";PWD=" + connectionNode.password +
                   ";HOSTNAME=" + connectionNode.host +
                   ";port=" + connectionNode.port;

    return Promise.resolve(connString);
  }

  function performConnection(connString) {
    var p = new Promise(function resolver(resolve, reject){
      // reject('still checking ...');
      ibmdb.open(connString,  function (err, conn) {
        if (err) {
          reject(err);
        } else {
          resolve(conn);
        }
      });
    });
    return p;
  }

  function listTables(connectionNode, c) {
    var p = new Promise(function resolver(resolve, reject){
      var creator = connectionNode.creator ? connectionNode.creator : 'CUSTOMER';
      var q = 'select tt.CREATOR, tt.NAME table, tc.NAME column, tc.COLTYPE ' +
                'from sysibm.syscolumns tc, sysibm.systables tt ' +
                'where tc.TBCREATOR = ? ' +
                'and tc.TBCREATOR = tt.CREATOR ' +
                'and tc.TBNAME = tt.NAME ' +
                'order by tt.CREATOR, tt.NAME';

       c.query(q, [creator], function (err, data) {
         if (err) {
           reject(err);
         } else {
           resolve(data);
         }
       });
    });
    return p;
  }

  function runQuery(c, q, p) {
    var p = new Promise(function resolver(resolve, reject){
      //var q = config.query;
      //console.log('will be running query', q);
      c.query(q, p, function (err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
    return p;
  }

  function checkIfArray(data) {
    if (Array.isArray(data)) {
      return Promise.resolve(data);
    }
    return Promise.reject('data is not an array');
  }

  function buildGenericResponse(msg, data) {
    var p = new Promise(function resolver(resolve, reject) {
      msg.payload = data;
      resolve();
    });
    return p;
  }


  function buildResponse(msg, data) {
    var p = new Promise(function resolver(resolve, reject) {
      //msg.allUnprocessedData = data;
      msg.payload = {'tables' : {}};
      var creator = null, table = null;
      var tableData = {};
      data.forEach(function(e) {
        if (e.CREATOR && e.TABLE) {
          if (creator !== e.CREATOR || table !== e.TABLE) {
            creator = e.CREATOR;
            table = e.TABLE;
            if (tableData && tableData.creator) {
              msg.payload.tables[tableData.creator + '.' + tableData.table] = tableData;
            }
            tableData = {'creator' : creator, 'table' : table, 'columns' : []};
          }
          tableData.columns.push({'column' : e.COLUMN, 'type' : e.COLTYPE});
        }
        // Final Table will not be detected as a change
        if (tableData && tableData.creator) {
          msg.payload.tables[tableData.creator + '.' + tableData.table] = tableData;
        }
      });
      resolve();
    });
    return p;
  }

  function closeConnection(c) {
    var p = new Promise(function resolver(resolve, reject){
      c.close(function(){
        resolve();
      })
    });
    return p;
  }

  function doSomething() {
    var p = new Promise(function resolver(resolve, reject) {
      reject('nothing yet implemented');
    });
    return p;
  }

  function reportError(node, msg, err) {
    var messageTxt = err;
    if (err.error) {
      messageTxt = err.error;
    } else if (err.description) {
      messageTxt = err.description;
    } else if (err.message) {
      messageTxt = err.message;
    }
    node.status({ fill: 'red', shape: 'dot', text: messageTxt });

    msg.result = {};
    msg.result['error'] = err;
    node.error(messageTxt, msg);
  }

  function Node(config) {
    var node = this;
    RED.nodes.createNode(this, config);

    node.connectionNode = RED.nodes.getNode(config.connection);

    this.on('input', function(msg) {
      var options = {};
      var query = '';
      var parameters = [];
      //var message = '';
      node.status({ fill: 'blue', shape: 'dot', text: 'initialising' });

      var connection = null;

      start(msg, config)
        .then(function(q){
          if (q) {
            query = q;
          }
          return checkForParameters(msg, config);
        })
        .then(function(p){
          parameters = p;
          return determineConnectionString(node.connectionNode);
        })
        .then(function(connString){
          node.status({ fill: 'blue', shape: 'dot', text: 'connecting' });
          return performConnection(connString)
        })
        .then(function(c){
          connection = c;
          node.status({ fill: 'blue', shape: 'dot', text: 'retrieving data' });
          if (query) {
            return runQuery(connection, query, parameters);
          } else {
            return listTables(node.connectionNode, connection);
          }
        })
        .then(function(d){
          return checkIfArray(d);
        })
        .then(function(d){
          node.status({ fill: 'blue', shape: 'dot', text: 'buildingResponse' });
          if (query) {
            return buildGenericResponse(msg, d);
          } else {
            return buildResponse(msg, d);
          }
        })
        .then(function(){
          return closeConnection(connection);
        })
        .then(function() {
          node.status({});
          node.send(msg);
        })
        .catch(function(err) {
          reportError(node,msg,err);
          node.send(msg);
        });

    });
  }

  RED.nodes.registerType('db2z', Node, {
    credentials: {
      token: {
        type: 'text'
      }
    }
  });
};
