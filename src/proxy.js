import PouchDB from 'pouchdb-browser';

export default new Proxy(
  {
    version: '__VERSION__',
    databases: {},
    Constructor: PouchDB,
    defaultDB: '',
    getDB(db = this.defaultDB, options = {}) {
      if (db instanceof URL) db = db.toString()
      if (this.databases[db] instanceof this.Constructor) return this.databases[db]
      else if (Object.values(this.databases).includes(db)) return db
      else {
        this.databases[db] = new this.Constructor(db, options)
        this.databases[db].on('destroyed', () => {
          delete this.databases[db]
        });
        return this.databases[db]
      }
    },

    sync(otherDB, options = {}) {
      return this.getDB().sync(this.getDB(otherDB), this._mergedefaults(options))
    },

    ecoSync(otherDB, options = {}) {
      return new Promise((resolve, reject) => {
        this.pull(otherDB)
          .on("complete", () => {
            resolve(this.sync(otherDB, options))
          })
          .on("error", reject)
      })
    },

    pull(sourceDB, options = {}) {
      return this.getDB().replicate.from(this.getDB(sourceDB), this._mergedefaults(options))
    },

    push(targetDB, options = {}) {
      return this.getDB().replicate.to(this.getDB(targetDB), this._mergedefaults(options))
    },

    _backOff(delay) { return delay === 0 ? 1000 : delay * 3 },
    
    _mergedefaults(options) {
      return {
        live: true,
        retry: true,
        back_off_function: this._backOff,
        ...options
      }
    }
  },
  {

    // TODO: Proxy the getted database
    get: function (target, propKey, receiver) { // works for this.$pouch.prop AND this.$pouch['prop']
      if (propKey in target) return Reflect.get(...arguments) // try to access local properties ie: this.$pouch.getDB, this.$pouch.pull, this.$pouch.push, this.$pouch.sync
      else if (propKey in target.databases) return Reflect.get(target.databases, propKey, receiver) // if not, we try to access a database object. ie: this.$pouch['dbURI'] or this.$pouch.dbURI
      else if (propKey in target.getDB()) return Reflect.get(target.getDB(), propKey, receiver) // if not we try to access defaut database propery. ie: this.$pouch.get, this.$pouch.allDocs, ...
      else return Reflect.get(target.Constructor, propKey, receiver) // if not, return a PouchDB property. ie: this.$pouch.get, this.$pouch.allDocs, ...
    }
  }
)
