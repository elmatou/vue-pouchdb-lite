# Vue PouchDB Lite

A really lite Vue plugin to get your PouchDB databases in every instance.

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

You should have `PouchDB` already present in the scope :
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

Vue.use(VuePouchdbLite, "FooDB");
```
or, if you want some defaults upon database creation.

```javascript
Vue.use(VuePouchdbLite, "FooDB", PouchDB.defaults({prefix: 'Bar'}));
```

## API
### $pouch

* `$pouch` is a Proxy object targeting the default database , meaning you have access to the whole PouchDB API, even the methods added by plugins.
* `$pouch` allows you to access all databases instantiated with it `$pouch['myDB']` or `$pouch.getDB[''myDB]`.
* `$pouch` is made available as an instance property, meaning you can access it in any views or components. just `this.$pouch`

```vue

$pouch                                // <PouchDB> default database
$pouch['myDB']                        // <PouchDB> 'myDB' in browser database
$pouch['http://localhost:5384']       // <PouchDB> remote database

<script>
  export default {
    created: function() {
      this.$pouch.sync('http://localhost:5984/todos', options);
    }
  }
</script>
```

Once created, the database are accessible through `$pouch['database_URI']`
You'll have to add the needed listeners by yourself.

#### Methods

* `$pouch.getDB(database, [options])`: Returns the database object from memory or a newly created one.
* `$pouch.sync(remoteDB, [options])`: It is a equivalent to `PouchDB.sync(defaultDB, remoteDB, default_options)`. 
* `$pouch.pull(sourceDB, [options])`: It is a equivalent to `defaultDB.replicate.from(sourceDB, default_options)`. 
* `$pouch.push(targetDB, [options])`: It is a equivalent to `defaultDB.replicate.to(targetDB, default_options)`. 

**That's it for the new methods. Do not forget, the whole PouchDB API is directly avaliable.**

see :https://pouchdb.com/api.html

default options (will be merged with the options passed in):
 ```javascript
default_options = {
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
      },

// If you only want to sync a single document that matches a selector, use `first: true`:
      projectDetails() {
        return {
          database: 'projects',
          selector: {_id: this.selectedProjectId},
          first: true
        }
      }
    }
  })
</script>
```

## Differences with `pouch-vue`

Despite the lack of event emited (but you can listen for any change using  PouchDB API); some methods and concepts are not the same.

* Plugin is added to Vue with two arguments (default database name, PouchDB optionnal constructor), not an Object.
* last argument in each method was specific database name. It is removed in favor of `$pouch['database'].the_method()`
* all other specific methods are removed
* liveFeed are set to null when database is destroyed.