import PouchDB from 'pouchdb-browser';
import PouchFind from "pouchdb-find";
import PouchLiveFind from "pouchdb-live-find";
PouchDB.plugin(PouchFind);
PouchDB.plugin(PouchLiveFind);

export default {
  /* Creates a property in 'data' with 'null' value for each pouch property
   * defined on the component.  This way the user does not have to manually
   * define a data property for the reactive databases/selectors.
   *
   * This partial 'data' object is mixed into the components along with
   * the rest of the API (but is empty unless the component has a 'pouch'
   * option).
   */
  data(vm) {
    let pouchOptions = vm.$options.pouch
    if (typeof pouchOptions === 'undefined' || pouchOptions === null) return {}
    if (typeof pouchOptions === 'function') pouchOptions = pouchOptions(vm)
    return Object.keys(pouchOptions).reduce((accumulator, currentValue) => {
      accumulator[currentValue] = null
      return accumulator
    }, {})
  },

  // lifecycle hooks for mixin

  // now that the data object has been observed and made reactive
  // the api can be set up
  created() {
    this._liveFeeds = {}
    let pouchOptions = this.$options.pouch
    if (!pouchOptions) return

    if (typeof pouchOptions === 'function') {
      pouchOptions = pouchOptions()
    }

    Object.keys(pouchOptions).map(key => {
      let pouchFn = pouchOptions[key]
      if (typeof pouchFn !== 'function') {
        pouchFn = () => {
          return pouchOptions[key]
        }
      }

    // if the selector changes, modify the liveFeed object
    // There is 2 way to define a selector  
    // pouch: {
    //   people() {
    //     if (!this.age) return;
    //     return {age: this.age, type: "person"}
    //   },
    //   peopleInOtherDatabase() {
    //     return {
    //       database: this.$pouch['databaseURI'], // you can pass a database string or a pouchdb instance
    //       selector: {type: "person"},
    //       sort: [{name: "asc"}],
    //       limit: this.resultsPerPage,
    //       skip: this.resultsPerPage * (this.currentPage - 1),
    //       fields: ['name']
    //     }
    //   }
    // }

      this.$watch(
        pouchFn,
        ({ database, first, fields, sort, limit, skip, selector = {}, ...options }) => {
          // merge both syntaxes.
          selector = {...options, ...selector};
          let db = this.$pouch.getDB(database || key);

          if (!db) {
            this.$emit('pouchdb-livefeed-error', {
              db: key,
              error: 'Null or undefined database'
            })
            return
          }

          // reset the liveFeed
          if (this._liveFeeds[key]) this._liveFeeds[key].cancel()
          let aggregateCache = []

          // the LiveFind plugin returns a liveFeed object
          this._liveFeeds[key] = db
            .liveFind({
              selector, 
              fields, 
              sort, 
              limit, 
              skip,
              aggregate: true
            })
            .on('update', (_, aggregate) => {
              if (first && aggregate) { aggregate = aggregate[0] }
              this.$data[key] = aggregateCache = aggregate
            })
            .on('ready', () => {
              this.$data[key] = aggregateCache
            })
            .on('error', console.error)
            .catch(console.error);
            
            db.on('destroyed', () => {
              this.$data[key] = aggregateCache = [];
            })
        },
        {
          immediate: true
        }
      )
    })
  },
  // tear down the liveFeed objects
  beforeDestroy() {
    Object.keys(this._liveFeeds).map(lfKey => {
      this._liveFeeds[lfKey].cancel()
    })
  }
}
