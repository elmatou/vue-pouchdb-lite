import PouchDB from 'pouchdb-browser';

export default new Proxy(
  {
    version: '__VERSION__',
    databases: {},
    Constructor: PouchDB,
    defaultDB: '',
    get(db = this.defaultDB, options = {}) {
      // See: https://pouchdb.com/api.html#create_database
      if (this.databases[db]) return this.databases[db]
      else {
        this.databases[db] = new this.Constructor(db, options)
        return this.databases[db]
      }
    },

    sync(otherDB, options = {}) {
      return PouchDB
        .sync(this.get(otherDB), this.get(), {
          live: true,
          retry: true,
          back_off_function: this._backOff,
          ...options
        })
    },

    push(otherDB, options = {}) {
      return this.get(otherDB).replicate
        .to(this.get(), {
          live: true,
          retry: true,
          back_off_function: this._backOff,
          ...options
        })
    },

    pull(otherDB, options = {}) {

      return this.get(otherDB).replicate
        .from(this.get(), {
          live: true,
          retry: true,
          back_off_function: this._backOff,
          ...options
        })
    },

    changes(options = {}) {
      return this.get()
        .changes({
          live: true,
          retry: true,
          back_off_function: this._backOff,
          ...options
        })
    },

    // get(object, options = {}) {},
    // put(object, options = {}) {},
    // post(object, options = {}) {},
    // remove(object, options = {}) {},
    // query(fun, options = {}) {},
    // find(options) {},
    // createIndex(index) {},










    fetchSession(db = this.$pouch.databases[this.$pouch.defaultDB]) {
      return new Promise(resolve => {
        db
          .getSession()
          .then(session => {
            db
              .getUser(session.userCtx.name)
              .then(userData => {
                resolve({
                  user: {
                    ...session.userCtx,
                    ...userData
                  },
                  hasAccess: true
                })
              })
          })
      })
    },

    login(db = this.$pouch.databases[this.$pouch.defaultDB]) {
      return new Promise(resolve => {
        db
          .logIn(this.$pouch.defaultUsername, this.$pouch.defaultPassword)
          .then(user => {
            db
              .getUser(user.name)
              .then(userData => {
                resolve({
                  user: {
                    ...user,
                    ...userData
                  },
                  hasAccess: true
                })
              })
          })
      })
    },
    connect(username, password) {
      return new Promise(resolve => {
        this.defaultUsername = username
        this.defaultPassword = password

        if (!this.get().db._remote) {
          resolve({
            message: 'database is not remote',
            error: 'bad request',
            status: 400
          })
          return
        }

        this.login(this.get())
      })
    },
    createUser(username, password) {
      return this.get()
        .signUp(username, password)
        .then(() => {
          return this.connect(username, password)
        })
    },
    // putUser(username, metadata = {}) {},
    // deleteUser(username) {},
    // changePassword(username, password) {},
    // changeUsername(oldUsername, newUsername) {},
    // signUpAdmin(adminUsername, adminPassword) {},
    // deleteAdmin(adminUsername) {},

    disconnect() {
      return new Promise(resolve => {
        this.defaultUsername = null
        this.defaultPassword = null

        if (!this.get().db._remote) {
          resolve({
            message: 'database is not remote',
            error: 'bad request',
            status: 400
          })
          return
        }

        this.get()
          .logOut()
          .then(res => {
            resolve({
              ok: res.ok,
              user: null,
              hasAccess: false
            })
          })
          .catch(error => {
            resolve(error)
          })
      })
    },

    destroy(db = this.defaultDB) {
      return this.get().destroy().then(() => {
        if (db !== this.defaultDB) {
          delete this.databases[db]
        }
      })
    },


    close(db = this.defaultDB) {
      return this.get().close().then(() => {
        if (db !== this.defaultDB) {
          delete this.databases[db]
        }
      })
    },

    getSession() {
      if (!this.get().db._remote) {
        return new Promise(resolve => {
          resolve({
            message: 'database is not remote',
            error: 'bad request',
            status: 400
          })
        })
      }
      return this.fetchSession(this.get())
    },

    allDocs(options = {}) {
      return this.get().allDocs({
        include_docs: true,
        ...options
      })
    },

    // bulkDocs(docs, options = {}) {},
    // compact(options = {}) {},
    // viewCleanup() {},
    // info() {},

    putAttachment(docId, rev, attachment) {
      return this.get().putAttachment(
        docId,
        attachment.id,
        rev ? rev : null,
        attachment.data,
        attachment.type
      );
    },

    // getAttachment(docId, attachmentId) {},

    // deleteAttachment(docId, attachmentId, docRev) {
    //   return this.get().removeAttachment(
    //     docId,
    //     attachmentId,
    //     docRev
    //   )
    // },

    _backOff(delay) { return delay === 0 ? 1000 : delay * 3 }


    // PouchDB.replicate(source, target, [options])
    // PouchDB.sync(src, target, [options])
    // PouchDB.debug(selector)
    // PouchDB.defaults(options)
    // PouchDB.on(created|destroyed, callback);
  },
  {
    get: function (target, propKey, receiver) {
      if (propKey in target) return Reflect.get(...arguments) // try to access local properties
      else if (propKey in target.databases) return Reflect.get(target.databases, propKey, receiver) // if not, we try to access a database object
      else if (propKey in target.get()) return Reflect.get(target.get(), propKey, receiver) // if not we try to acces defaut database propery. 
      else return Reflect.get(PouchDB, propKey, receiver) // if not, return a PouchDB property.
    }
  }
)
