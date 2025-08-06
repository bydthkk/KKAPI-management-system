<template>
  <div id="app">
    <h1>简单测试应用</h1>
    <p>这是一个简单的Vue应用，用于测试基本功能。</p>
    <button @click="count++">点击次数: {{ count }}</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<style>
#app {
  text-align: center;
  padding: 50px;
  font-family: Arial, sans-serif;
}

button {
  padding: 10px 20px;
  font-size: 16px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background: #5855eb;
}
</style>