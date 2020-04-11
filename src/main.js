import styleTransferElement from './components/StyleTransferElement';

const VueStyleTransfer = {
  install (Vue) {
    Vue.component(styleTransferElement.name, styleTransferElement)
  }
}

export default VueStyleTransfer

if (typeof window !== 'undefined' && window.Vue) {
  window.Vue.use(VueStyleTransfer)
}