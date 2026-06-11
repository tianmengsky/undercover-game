JavaSE：视频    

Java：面向对象，集合、interface、封装、构造器

springboot：restful、分层、拦截器封装       后端发起客户端请求

# 一、Vue 样式动态绑定

## 1. 课程目标

1. 理解为什么要用**动态样式**，区分原生 class 与 Vue 动态绑定
2. 掌握 `:class` 三种用法：**对象语法、数组语法、三元表达式**
3. 掌握 `:style` 行内样式动态绑定
4. 能结合业务场景实现切换样式、高亮、状态变色等效果

## 2. 动态绑定 class

### 2.1 对象语法

```
:class="{ 类名: 布尔值 }"
```

- 布尔值为 `true`：类名生效
- 布尔值为 `false`：类名移除

```vue
<template>
  <div>
    <!-- 动态控制 active 类 -->
    <div class="box" :class="{ active: isActive }">测试文本</div>
    <button @click="isActive = !isActive">切换样式</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isActive: false
    }
  }
}
</script>

<style>
.box {
  width: 200px;
  height: 80px;
  line-height: 80px;
  border: 1px solid #ccc;
}
.active {
  background: #409eff;
  color: #fff;
}
</style>
```

#### 拓展：多个类名同时控制

```
<div class="box" :class="{ active: isActive, big: isBig }">多类名控制</div>
```

### 2.2 三元表达式（二选一样式）

适合**两种状态互斥**场景：选中 / 未选中、成功 / 失败。

```
:class="布尔值 ? '类名1' : '类名2'"
```

```
<div :class="isSuccess ? 'success' : 'error'">状态提示</div>
```



# 二、 动态绑定 style

## 2.1 对象语法

```
:style="{ css属性名: 数据变量 }"
```

**注意**：CSS 连字符属性 → 改为**小驼峰**

```
font-size` → `fontSize`、`background-color` → `backgroundColor
```

#### 案例

```vue
<template>
  <div :style="{ color: textColor, fontSize: size + 'px' }">动态行内样式</div>
</template>
<script>
export default {
  data() {
    return {
      textColor: "red",
      size: 20
    }
  }
}
</script>
```

# 三、计算属性 

## 1. 课程目标

1. 理解计算属性作用、特点，区分 `methods` 和 `computed`
2. 掌握计算属性**基本用法、依赖缓存、只读 / 读写**
3. 结合样式、表单、字符串拼接做实战案例
4. 掌握使用场景：数据**二次加工、复杂逻辑计算**

## 2. 基本语法

计算属性写在 `computed` 配置项中，写法和方法一致，**但调用时不加 `()`**。

```vue
<script>
export default {
  data() {
    return { /* 原始数据 */ }
  },
  computed: {
    // 计算属性函数：返回计算结果
    计算属性名() {
      // 逻辑处理
      return 最终结果
    }
  }
}
</script>

<!-- 模板中使用：直接写名称，不加括号 -->
<div>{{ 计算属性名 }}</div>
```

## 3. 核心案例讲解

### 案例 1：字符串拼接

```vue
<template>
  <div>
    <p>原始姓名：{{ firstName }} {{ lastName }}</p>
    <p>计算属性拼接全名：{{ fullName }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      firstName: "张",
      lastName: "三"
    }
  },
  computed: {
    fullName() {
      // 依赖 data 中的数据
      return this.firstName + "-" + this.lastName
    }
  }
}
</script>
```

### 案例 2：结合动态样式

根据分数动态计算等级，再绑定样式：

```vue
<template>
  <!-- 计算属性返回类名，绑定到 :class -->
  <div :class="levelClass">分数等级展示</div>
  <input v-model="score" type="number">
</template>

<script>
export default {
  data() {
    return {
      score: 80
    }
  },
  computed: {
    levelClass() {
      if(this.score >= 90) return "excellent"
      if(this.score >= 60) return "normal"
      return "bad"
    }
  }
}
</script>

<style>
.excellent { color: green; }
.normal { color: orange; }
.bad { color: red; }
</style>
```

# 四、3. 计算属性 vs 方法 methods

### 核心区别：**缓存**

1. **计算属性 computed**
   - 基于**依赖数据缓存**
   - 依赖数据不变，多次调用**只执行一次**
   - 模板中使用：`{{ 名称 }}` 无括号
   - 适合：**复杂计算、多次调用**
2. **方法 methods**
   - 无缓存，**每调用一次就执行一次**
   - 模板中使用：`{{ 方法名() }}` 必须加括号
   - 适合：**事件触发、单次逻辑、异步操作**

### 对比演示代码

```vue
<template>
  <!-- 调用3次 -->
  <div>{{ getMsg() }}</div>
  <div>{{ getMsg() }}</div>
  <div>{{ getMsg() }}</div>

  <div>{{ msg }}</div>
  <div>{{ msg }}</div>
  <div>{{ msg }}</div>
</template>

<script>
export default {
  data(){ return { str: "测试" } },
  methods:{
    getMsg(){
      console.log("方法执行了")
      return this.str
    }
  },
  computed:{
    msg(){
      console.log("计算属性执行了")
      return this.str
    }
  }
}
</script>
```

运行结果：

- 方法：控制台打印 **3 次**
- 计算属性：控制台只打印 **1 次**（缓存生效）

#  五、生命周期函数

## 整体执行顺序

`beforeCreate` → `created` → `beforeMount` → `mounted` →

```
beforeUpdate` → `updated` → `beforeDestroy` → `destroyed
```

------

## 阶段 1：创建阶段（组件刚创建，还未渲染 DOM）

#### 1. beforeCreate 创建前

- 触发时机：实例刚创建，**data、methods 都未初始化**
- 无法使用：`this.xxx`、无法操作数据、无法操作 DOM
- **几乎不用**

#### 2. created 创建完成（高频使用）

- 触发时机：`data`、`methods` 已初始化完成，**DOM 还没生成**
- 可以做：
  1. **发起接口请求**（最常用！对接你之前的 API 封装）
  2. 初始化数据、调用方法
- 不可以：操作 DOM（页面还没渲染）

```vue
<script>
import { userApi } from '@/api/index'
export default {
  data(){ return { userInfo: {} } },
  // 创建完成：页面一加载就请求接口
  async created() {
    const res = await userApi.getUserInfo()
    this.userInfo = res.data
  }
}
</script>
```

## 阶段 2：挂载阶段（DOM 渲染到页面）

#### 3. beforeMount 挂载前

- DOM 开始编译，**还没渲染到页面**
- 极少使用

#### 4. mounted 挂载完成（超级高频）

- 触发时机：**DOM 已经渲染完毕，组件真实出现在页面上**
- 可以做：
  1. **操作 DOM 元素**（获取节点、修改样式、原生 DOM 操作）
  2. 开启定时器、开启轮播、第三方 DOM 库初始化
- 场景：需要获取页面标签、操作 DOM 一律写在 `mounted`

------

## 阶段 3：更新阶段（数据变化 → 页面重新渲染）

#### 5. beforeUpdate 更新前

- 数据已改变，页面 DOM **还未重新渲染**

#### 6. updated 更新完成

- 数据改变，**页面 DOM 重新渲染完毕**
- 适用：数据更新后再次操作 DOM

> 注意：频繁修改数据会反复触发更新钩子，避免在这里写复杂逻辑。

------

## 阶段 4：销毁阶段（组件卸载、页面关闭 / 路由跳转）

#### 7. beforeDestroy 销毁前（高频）

- 组件即将销毁，**实例还能用**

- 核心作用：

  清除副作用

  - 清除定时器 `clearInterval`
  - 取消监听、关闭弹窗、停止轮播
  - 防止**内存泄漏**

#### 8. destroyed 销毁完成

- 组件彻底销毁，DOM 移除，实例解绑
- 一般用于收尾日志

## 生命周期流程图

```
组件创建
  ↓
beforeCreate → created（请求接口、初始化数据）
  ↓
beforeMount → mounted（操作DOM、定时器、第三方库）
  ↓
数据变化 → beforeUpdate → updated
  ↓
组件销毁/路由离开
  ↓
beforeDestroy（清除定时器/监听）→ destroyed
```