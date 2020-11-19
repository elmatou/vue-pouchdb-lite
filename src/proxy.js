import PouchDB from 'pouchdb-browser';

export default new Proxy(
  {
    version: '__VERSION__',
    databases: {},
    Constructor: PouchDB,
    defaultDB: '',
    getDB(db = this.defaultDB, options = {}) {
      if (db instanceof URL) db = db.toString()
      if (this.databases[db]) return this.databases[db]
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
            console.log('pulled')
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

    // fetchUserSession() {
    //   return new Promise(resolve => {
    //     this.getDB()
    //       .getDBSession()
    //       .then(session => {
    //         this.getDB()
    //           .getDBUser(session.userCtx.name)
    //           .then(userData => {
    //             resolve({
    //               ...session.userCtx,
    //               ...userData
    //             })
    //           })
    //       })
    //   })
    // },

    // close(db = this.defaultDB) {
    //   return this.getDB().close().then(() => {
    //     if (db !== this.defaultDB) {
    //       delete this.databases[db]
    //     }
    //   })
    // },

    // putAttachment(docId, rev, attachment) {
    //   return this.getDB().putAttachment(
    //     docId,
    //     attachment.id,
    //     rev ? rev : null,
    //     attachment.data,
    //     attachment.type
    //   );
    // },

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
    get: function (target, propKey, receiver) {
      if (propKey in target) return Reflect.get(...arguments) // try to access local properties
      else if (propKey in target.databases) return Reflect.get(target.databases, propKey, receiver) // if not, we try to access a database object
      else if (propKey in target.getDB()) return Reflect.get(target.getDB(), propKey, receiver) // if not we try to acces defaut database propery. 
      else return Reflect.get(target.Constructor, propKey, receiver) // if not, return a PouchDB property.
    }
  }
)
