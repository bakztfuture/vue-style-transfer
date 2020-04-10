<template>
  <div class="hello">
    <h1>Vue Style Transfer Example</h1>
    <p>The image below is the Vue logo crossed with Starry Night by Vincent van Gogh</p>
    <style-transfer-element
      width="400"
      height="400"
      alt-text="Vue logo crossed with Starry Night"
      :local-origin-image="require('../assets/logo.png')"
      styleURL="http://i.imgur.com/osSv3S2.jpg"
      :strength="0.1"
      >
    </style-transfer-element>
    <br />
    <br />
    <br />
    <br />
    <br />
    <br />
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  }
}
</script>
<script>
import StyleTransferElement from './StyleTransferElement'
export default {
  components: {
    StyleTransferElement
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
