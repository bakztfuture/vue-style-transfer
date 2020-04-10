import styleTransferElement from './components/StyleTransferElement';

const VueStyleTransfer = {
  install (Vue) {
    Vue.component(styleTransferElement.name, styleTransferElement)
  }
}

export default VueStyleTransfer