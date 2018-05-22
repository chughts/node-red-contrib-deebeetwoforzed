# node-red-contrib-deebeetwoforzed

This node allows for SQL based queries against a Z DB/2 database. This node is a simplification of the DashDB node, which should also work, but for some as yet undetermined reason doesn't.

## Install
**Please Note:** You must be on Node.js V 6 or higher. If you install the dependencies for this node at a lower version, then you will need to remove the dependencies, and rebuild when you are at the right version level.

As this node requires a Z / Db2 end user licence, the only way to install it is through npm

Enter the directory for the newly cloned node code then run the command
````
    npm install node-red-contrib-deebeetowforzed
````
to fetch and build the dependencies for the node.

## Licence

Access to a Z database requires a licence .lic file, which should be placed in the directory
`node_modules/ibm_db/installer/clidriver/license`

## Configuration

To make a database connection the node will need a connection configuration. Create a configuration by double selecting a node. You will need to provide: `database`, `host` (which can be an IP address), `port`, `username` and `password`. The `creator` setting is used by the node to fetch table listings, and only needs to be set if the node is going to be used in this way.

## Usage

There are three usage patterns for this node.

When no query is provided, the node will return a json object describing the `creator` tables.

You can provide a query in the node configuration, with optional parameters supplied as a comma separated list.

You can provide a query in `msg.payload`. If you don't want to provide a query in `msg.payload`, then `msg.payload` must not be set to a string.

### Input
The query in run in `msg.payload`.
Otherwise the query to run is determined by the node's configuration settings.

### Output
If a query has been provided, then the response will be an array of json objects. Each array will represent one row returned from the query.

### Sample Query
Any standard SQL query eg.
````
select * from customer.countries
where country_iso_code = ?
or country_iso_code = ?
````

### Sample flow
````
[{"id":"7174afb1.6d1a","type":"inject","z":"55f4128e.cc1a7c","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":120,"y":140,"wires":[["524547dc.0baf78","6d673afc.ae5ce4","3ce0d0b.78e943","70db3787.cc4ae8"]]},{"id":"e9c4ac87.a8e89","type":"debug","z":"55f4128e.cc1a7c","name":"","active":true,"console":"false","complete":"true","x":530,"y":120,"wires":[]},{"id":"524547dc.0baf78","type":"db2z","z":"55f4128e.cc1a7c","name":"Fetch Table Information","connection":"cb26c202.bd3d8","query":"","params":"","x":330,"y":60,"wires":[["e9c4ac87.a8e89"]]},{"id":"6d673afc.ae5ce4","type":"db2z","z":"55f4128e.cc1a7c","name":"Zero Parameter Call","connection":"cb26c202.bd3d8","query":"select * from customer.countries","params":"","x":320,"y":100,"wires":[["e9c4ac87.a8e89"]]},{"id":"3ce0d0b.78e943","type":"db2z","z":"55f4128e.cc1a7c","name":"Single Parameter Call","connection":"cb26c202.bd3d8","query":"select * from customer.countries\nwhere country_iso_code = ?","params":"CG","x":320,"y":160,"wires":[["e9c4ac87.a8e89"]]},{"id":"70db3787.cc4ae8","type":"db2z","z":"55f4128e.cc1a7c","name":"Double Parameter Call","connection":"cb26c202.bd3d8","query":"select * from customer.countries\nwhere country_iso_code = ?\nor country_iso_code = ?","params":"CW , NI","x":320,"y":200,"wires":[["e9c4ac87.a8e89"]]},{"id":"cb26c202.bd3d8","type":"db2z-config","z":"","host":"10.99.81.11","port":"42100","creator":"CUSTOMER","db":"DSNV12PH","name":"Yellow"}]
````

## Contributing

For simple typos and fixes please just raise an issue pointing out our mistakes. If you need to raise a pull request please read our [contribution guidelines](https://github.com/ibm-early-programs/node-red-contrib-deebeetwoforzed/blob/master/CONTRIBUTING.md) before doing so.

## Copyright and license

Copyright 2017,2018 IBM Corp. under the Apache 2.0 license.
