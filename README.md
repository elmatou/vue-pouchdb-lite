# Vue PouchDB Lite

A really lite Vue plugin to get your DB's in every instance.

##### Some content extracted from https://github.com/MDSLKTR/pouch-vue with a lot of api changes though.

## Why another library ?
 As always, support is the main reason you'll choose a library. 
 In this case, the original implemenation add some issues : lots of events emitted, live selector was not reset upon database destruction, and first of all the databases where recreated on each componnent render introducing heavy memory and cpu overhead. 
 
 Now we have lighter version with the same awsome Vue integration (and more).

## Installation
Install via npm:
```sh
    yarn add vue-pouchdb-lite
```

You should have `PouchDB` already imported :
```javascript
import PouchDB from "pouchdb-browser";
```

If you want to use remote databases (CouchDB, Cloudant, etc.), you should also install the authentication plugin:
```javascript
import PouchAuthentication from "pouchdb-authentication";
PouchDB.plugin(PouchAuthentication);
```

Then, plug vue-pouchdb-lite into Vue: (eg: in main.js)
```javascript
import VuePouchdbLite from "vue-pouchdb-lite";

Vue.use(VuePouchdbLite, {
  defaultDB: "local_or_remote_database"
});
```

## API
### $pouch

`$pouch` is a Proxy object targeting the default database, meaning you have access to the whole PouchDB API, even the methods added by plugins.
`$pouch` allow you to access all databases instantiated with `$pouch.get('database_URI', options)` 

`$pouch` is made available as an instance property, meaning you can access it in any views or components.

```vue
<script>
  export default {
    created: function() {
      this.$pouch.sync('todos', 'http://localhost:5984/todos', options);
    }
  }
</script>
```

Once created the database are accessible through `$pouch['database_URI']`

You'll have to add the listeners by yourself.

#### Methods

* `$pouch.get(database, OPTIONAL options)`: Returns the database object from memory or newly created.

* `$pouch.defaults(options)`: same as https://pouchdb.com/api.html#defaults___
* `$pouch.sync(localDatabase, OPTIONAL remoteDatabase, OPTIONAL options)`: The optional remoteDatabase parameter will use the default db set in the pouch options initially. Basically the same as PouchDB.sync(local, remote, {live: true, retry: true}). Also, if the browser has an active session cookie, it will fetch session data (username, etc) from the remote server. **BONUS:** If your remote database runs CouchDB 2.0 or higher, you can also specify a Mango Selector that is used to filter documents coming from the remote server. Callback functions will be invoked with the name `pouchdb-[method]-[type]`. So in this case you can use `this.$on('pouchdb-sync-change', callback(data))` to listen when a change occurs. See https://pouchdb.com/api.html#sync for a full list of events you can use.

* `$pouch.connect(username, password, OPTIONAL db)`: Connects you to the defaultDB or given remote DB and returns the user object on success.

* `$pouch.disconnect(OPTIONAL db)`: Disconnects you from the defaultDB or given remote DB and clears the session data.

* `$pouch.createUser(name, password, OPTIONAL db)`: Creates a user in the defaultDB or given remote DB and starts a new session.

**That's it for the new methods. Do not forget the whole PouchDB API is avaliable.**

default options (will be merged with the options passed in):
 ```javascript
{
    live: true,
    retry: true,
    back_off_function: (delay) => {
        if (delay === 0) {
            return 1000;
        }
        return delay * 3;
    },
}
```

## Reactive & Live Selectors (Mango Queries)

Using an options 

```vue
<template>
  Show people that are <input v-model="age"> years old.
  <div v-for="person in people">
    {{ person.name }}
  </div>
</template>

<script>
  export default {
    data () {
      return {
        resultsPerPage: 25,
        currentPage: 1
      }
    },
    // Use the pouch property to configure the component to (reactively) read data from pouchdb.
    pouch: {
      // The function returns a Mango-like selector that is run against the `people` database.
      // The result of the query is assigned to the `people` property.
      people() {
        if (!this.age) return;
        return {age: this.age, type: "person"}
      },
      // You can also specify the database dynamically (local or remote), as well as limits, skip and sort order:
      peopleInOtherDatabase() {
        return {
          database: this.selectedDatabase, // you can pass a database string or a pouchdb instance
          selector: {type: "person"},
          sort: [{name: "asc"}],
          limit: this.resultsPerPage,
          skip: this.resultsPerPage * (this.currentPage - 1)
        }
      }
    }
  })
</script>
```
## Examples

### Single documents

If you only want to sync a single document that matches a selector, use `first: true`:

```javascript
module.exports = {
  // ...
  pouch: {
    projectDetails() {
      return {
        database: 'mydatabase',
        selector: {_id: this.selectedProjectId},
        first: true
      }
    }
  }
  // ...
}
```

### User Authentication

```javascript
 this.$pouch.connect(this.credentials.username, this.credentials.password)
    .then((res) => {
        let isUnauthorized = res.error === 'unauthorized',
            isOffline = res.status === 0;

                if (isOffline) {
                    return;
                }

                if (isUnauthorized) {
                    return;
                }
                this.$router.push('/dashboard');
    })
    .catch(console.error);
```

### Handle Sessions
```javascript
this.$pouch.getSession().then((data) => {
    if (data.status === 0) {
        this.$router.push('/login');
            console.log('most likely offline');
            return;
        }

        if (!data.user || !data.hasAccess) {
            this.$router.push('/login');
            return;
        }

        this.$store.commit('UPDATE_SESSION', data);
});
```
