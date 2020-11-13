import pouchProxy from './proxy'
import pouchMixin from './mixin'

export default {
  install: (Vue, defaultDB, constructor) => {

    // console.debug(defaultDB, constructor, pouchProxy.Constructor)
    if (defaultDB) pouchProxy.defaultDB = defaultDB
    if (constructor) pouchProxy.Constructor = constructor;

    Vue.prototype.$pouch = pouchProxy;
    Vue.mixin(pouchMixin);
  }
}
