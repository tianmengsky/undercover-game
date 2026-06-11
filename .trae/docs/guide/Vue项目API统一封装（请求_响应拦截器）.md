# Vue项目API统一封装（请求/响应拦截器）

## 一、核心概念

**什么是 Axios？**

Axios 是基于 Promise 的 HTTP 请求库，Vue2 项目主流网络请求方案，支持浏览器和 Node\.js，可实现异步接口请求。

**什么是拦截器？**

拦截器是 Axios 提供的「全局钩子」，分为两种：

- **请求拦截器**：接口**发起之前**统一处理（加工请求参数、请求头）

- **响应拦截器**：接口**返回数据之后、页面接收之前**统一处理（解析数据、捕获错误、统一提示）

### 2\. 不封装的原生痛点

如果项目中直接在组件内写原生 Axios 请求，会出现大量问题：

- 每个接口都要重复写域名、超时时间、请求头，代码冗余

- 每个请求都要单独处理 token、单独判断报错，维护成本极高

- 接口域名、请求配置修改时，需要全局改所有代码，极易出错

- 错误提示不统一，页面交互杂乱无章

- 无法统一管理所有接口，项目臃肿混乱

**总结一句话**：不封装 = 代码混乱、难以维护、无法统一管控。

## 二、核心原理精讲

### 1\. 统一封装的核心思想

创建一个**自定义 Axios 实例**，统一配置基础参数，通过**请求\+响应拦截器**做全局统一处理，再将所有接口统一管理导出，组件只需要调用封装好的方法，无需关注底层请求逻辑。

### 2\. 拦截器执行流程

组件调用接口 → 请求拦截器（加工请求） → 发送网络请求 → 后端返回数据 → 响应拦截器（加工响应、处理错误） → 组件获取最终数据

### 3\. 两个拦截器核心作用

#### （1）请求拦截器（request）

执行时机：请求发送前

常用业务场景：

- 统一拼接后端接口基础域名

- 统一设置超时时间、请求头格式（Content\-Type）

- 统一携带登录 Token（权限校验核心）

- 开启全局 loading 加载动画

#### （2）响应拦截器（response）

执行时机：请求返回后，组件接收前

常用业务场景：

- 统一解构后端返回数据，简化组件取值

- 关闭全局 loading 加载动画

- 统一处理 HTTP 状态码、业务状态码

- 统一弹窗提示成功/失败信息

- 拦截无效响应、登录过期、权限不足等异常

## 三、配置教程

### 步骤1：安装依赖（Axios \+ ElementUI）

Vue2 项目适配对应版本依赖，统一安装避免版本兼容报错

```bash
# 安装适配Vue2的element-ui
npm i element-ui -S

# 安装固定版本axios
npm install axios@0.27.2 --save
```

### 步骤2：全局注册ElementUI

打开项目入口文件 **src/main\.js**，全局注册ElementUI，否则弹窗组件无法使用

```javascript
// src/main.js
import Vue from 'vue'
import App from './App.vue'
// 引入ElementUI组件库和样式
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
// 全局注册
Vue.use(ElementUI);

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
```

### 步骤3：核心文件 request\.js 封装

包含：实例创建、基础配置、请求拦截器、响应拦截器、错误统一处理，已适配原生ElementUI全局弹窗

```javascript
// src/api/request.js
import axios from 'axios'
// 引入全局ElementUI弹窗（注册后可直接使用）
import { Message } from 'element-ui'

// 1. 创建自定义axios实例
const service = axios.create({
  // 基础域名（环境区分：开发/生产）
  baseURL: process.env.VUE_APP_BASE_API,
  // 统一超时时间 10秒
  timeout: 10000,
  // 默认请求头
  headers: {
    'Content-Type': 'application/json;charset=UTF-8'
  }
})

// 2. 请求拦截器：请求发送前统一处理
service.interceptors.request.use(
  config => {
    // 统一携带token（从本地缓存获取）
    const token = localStorage.getItem('token')
    if (token) {
      // 固定后端鉴权格式
      config.headers.Authorization = `Bearer ${token}`
    }
    // 返回修改后的请求配置
    return config
  },
  error => {
    // 请求前置错误处理
    return Promise.reject(error)
  }
)

// 3. 响应拦截器：请求返回后统一处理
service.interceptors.response.use(
  // 成功响应（状态码200）
  response => {
    // 统一解构后端数据，组件无需重复取值
    const res = response.data
    // 可根据后端业务状态码自定义判断（示例：200成功，非200失败）
    if (res.code !== 200) {
      Message.error(res.msg || '请求失败')
      return Promise.reject(new Error(res.msg || '请求失败'))
    }
    // 返回核心数据给组件
    return res
  },
  // 响应错误（网络错误、状态码4xx/5xx）
  error => {
    // 关闭loading、统一错误提示
    let message = ''
    // 根据HTTP状态码分类提示
    switch (error.response?.status) {
      case 401:
        message = '登录已过期，请重新登录'
        // 可拓展：清空token、跳转登录页
        localStorage.removeItem('token')
        window.location.href = '/login'
        break
      case 403:
        message = '权限不足，无法访问'
        break
      case 404:
        message = '请求接口不存在'
        break
      case 500:
        message = '服务器内部错误'
        break
      default:
        message = '网络请求失败'
    }
    Message.error(message)
    return Promise.reject(error)
  }
)

// 导出封装好的实例
export default service
```

在 src 下新建目录，统一管理请求文件

```Plain Text
src
└── api
    ├── request.js  # axios实例封装+拦截器配置（核心文件）
    └── index.js    # 所有接口统一汇总导出
```

### 步骤4：环境变量配置（

包含：实例创建、基础配置、请求拦截器、响应拦截器、错误统一处理

```javascript
// src/api/request.js
import axios from 'axios'
// 可引入UI弹窗组件（以element-ui为例）
import { Message } from 'element-ui'

// 1. 创建自定义axios实例
const service = axios.create({
  // 基础域名（环境区分：开发/生产）
  baseURL: process.env.VUE_APP_BASE_API,
  // 统一超时时间 10秒
  timeout: 10000,
  // 默认请求头
  headers: {
    'Content-Type': 'application/json;charset=UTF-8'
  }
})

// 2. 请求拦截器：请求发送前统一处理
service.interceptors.request.use(
  config => {
    // 统一携带token（从本地缓存获取）
    const token = localStorage.getItem('token')
    if (token) {
      // 固定后端鉴权格式
      config.headers.Authorization = `Bearer ${token}`
    }
    // 返回修改后的请求配置
    return config
  },
  error => {
    // 请求前置错误处理
    return Promise.reject(error)
  }
)

// 3. 响应拦截器：请求返回后统一处理
service.interceptors.response.use(
  // 成功响应（状态码200）
  response => {
    // 统一解构后端数据，组件无需重复取值
    const res = response.data
    // 可根据后端业务状态码自定义判断（示例：200成功，非200失败）
    if (res.code !== 200) {
      Message.error(res.msg || '请求失败')
      return Promise.reject(new Error(res.msg || '请求失败'))
    }
    // 返回核心数据给组件
    return res
  },
  // 响应错误（网络错误、状态码4xx/5xx）
  error => {
    // 关闭loading、统一错误提示
    let message = ''
    // 根据HTTP状态码分类提示
    switch (error.response?.status) {
      case 401:
        message = '登录已过期，请重新登录'
        // 可拓展：清空token、跳转登录页
        localStorage.removeItem('token')
        window.location.href = '/login'
        break
      case 403:
        message = '权限不足，无法访问'
        break
      case 404:
        message = '请求接口不存在'
        break
      case 500:
        message = '服务器内部错误'
        break
      default:
        message = '网络请求失败'
    }
    Message.error(message)
    return Promise.reject(error)
  }
)

// 导出封装好的实例
export default service
```

### 步骤5：接口统一管理 index\.js

项目根目录创建 \.env\.development 开发环境文件

```javascript
# 开发环境接口域名
VUE_APP_BASE_API = 'http://localhost:8080/api'
```

### 步骤6：组件中使用封装后的接口

所有接口集中管理，便于维护，避免接口散落组件

```javascript
// src/api/index.js
import request from './request'

// 示例：用户相关接口
export const userApi = {
  // 登录接口
  login(data) {
    return request.post('/user/login', data)
  },
  // 获取用户信息
  getUserInfo() {
    return request.get('/user/info')
  }
}

// 示例：文章相关接口
export const articleApi = {
  getArticleList(params) {
    return request.get('/article/list', { params })
  }
}

```

### 步骤6：组件中使用封装后的接口

组件内无需处理请求配置、错误拦截，直接调用即可

```javascript
// 组件中使用
import { userApi } from '@/api/index'

export default {
  mounted() {
    this.getInfo()
  },
  methods: {
    async getInfo() {
      try {
        const res = await userApi.getUserInfo()
        // 直接获取后端核心数据，简洁高效
        console.log('用户信息', res.data)
      } catch (err) {
        // 错误已全局提示，组件只需处理个性化逻辑
        console.log(err)
      }
    }
  }
}

```

## 五、重点难点解析

### 1\. 为什么要新建 Axios 实例，不直接使用全局 Axios？

全局 Axios 是单例，若直接修改全局拦截器，会污染所有请求；新建自定义实例，**隔离配置、灵活可控**，可适配多域名接口场景。

### 2\. Promise\.reject 的作用是什么？

拦截器捕获错误后，必须通过 `Promise\.reject\(error\)` 将错误抛出，否则组件中 `catch` 无法捕获错误，会导致请求失败后代码正常执行，逻辑混乱。

### 3\. 401 登录过期逻辑核心

检测到 401 状态码 → 清空本地过期 token → 跳转登录页 → 拒绝 Promise，终止后续逻辑，是后台系统权限拦截的核心逻辑。
