AI：不可控  难度  

- RAG：200对词语  

- 简单   适中  后端  

- 难度：困难      难度：适中

  [{

  ​	title:"",

  ​	content:""

  },{},{}]

# 搭建词语生成器Agent

## 一、登录 Dify 后台

进入 Dify 主页，左侧导航栏找到 **知识库** 模块。

![img](file:///C:\Users\28123\AppData\Local\Temp\QQ_1780144749834.png)

## 二、新建知识库

1. 点击页面右上角 **创建知识库**；

   ![img](file:///C:\Users\28123\AppData\Local\Temp\QQ_1780144845501.png)

## 三、上传本地词库文件

1. 在知识库页面，点击 **上传文件**；

2. 选择上传方式：**本地文件**；

3. 选中桌面准备好的 `CSV/TXT` 词库文件，确认上传；

4. 等待解析：页面显示「解析中」，文件越大等待时间略长。

   ![img](file:///C:\Users\28123\AppData\Local\Temp\QQ_1780144968706.png)

## 四、配置知识库检索规则

### 1.分段设置

![img](file:///C:\Users\28123\AppData\Local\Temp\QQ_1780144991613.png)

### 3.Embedding 模型配置

![img](file:///C:\Users\28123\AppData\Local\Temp\QQ_1780145148378.png)

### 4. 检索模式选择

- 采用全文检索

- 召回数量设置为最大

- Score阈值设置为0，这里不需要召回分数筛选

  ![img](file:///C:\Users\28123\AppData\Local\Temp\QQ_1780145206264.png)

## 五、召回测试

![img](file:///C:\Users\28123\AppData\Local\Temp\QQ_1780145386280.png)

- 输入【难度：简单】，RAG按照全文检索的方式，召回了10条分数排名最靠前的数据，知识库搭建完成
- 后续可通过后端代码控制不同管卡需要的不同难度的词语

## 六、搭建词语生成工作流

### 1. 创建空白应用

![img](file:///C:\Users\28123\AppData\Local\Temp\QQ_1780145592762.png)

### 2. 选择多轮对话流

- 填写应用名称
- 填写智能体描述

![img](file:///C:\Users\28123\AppData\Local\Temp\QQ_1780145642959.png)

### 3. 添加知识检索节点

![img](file:///C:\Users\28123\AppData\Local\Temp\QQ_1780145838739.png)

- 知识检索完成的内容只能输入给LLM做推理

### 4. 设置模型节点

![img](file:///C:\Users\28123\AppData\Local\Temp\QQ_1780145931251.png)

- 设置回复格式为JSON格式

- 设置模型上下文为知识检索的输出

- 设置模型系统提示词

  ![img](file:///C:\Users\28123\AppData\Local\Temp\QQ_1780146038048.png)

  ```markdown
  角色：你是《谁是卧底》游戏助手
  任务：
  1.  只使用「知识检索」节点返回的10对词语数据{{#context#}}，**绝对不能编造任何不在数据里的词**。
  2.  从这10对词语中，**随机选择1对**作为本次游戏的题目，不要总是选固定位置的。
  
  输出：输出格式必须严格按照下面的JSON格式，**只返回JSON，不要加任何多余的解释、说明、符号、Markdown格式**：
  {
    "common_word": "这里填选中的普通词",
    "undercover_word": "这里填选中的卧底词",
    "difficulty": "这里填这对词语的难度"
  }
  
  限制：绝对不能编造任何不在数据里的词
  ```

### 5. 模型输出设置

- 输出设置采用JSON格式输出

- 系统提示词中已经规定了模型的输出格式，但是模型本身的性能不稳定，需要再强制规定输出格式，提高容错性

  ![img](file:///C:\Users\28123\AppData\Local\Temp\QQ_1780146269545.png)

  ```json
  {
    "type": "object",
    "properties": {
      "common_word": {
        "type": "string",
        "description": "游戏的普通词"
      },
      "undercover_word": {
        "type": "string",
        "description": "游戏的卧底词"
      },
      "difficulty": {
        "type": "string",
        "description": "词语对的难度"
      }
    },
    "required": [
      "common_word",
      "undercover_word",
      "difficulty"
    ],
    "additionalProperties": false
  }
  ```

### 6. 添加输出节点

![img](file:///C:\Users\28123\AppData\Local\Temp\QQ_1780146347538.png)

### 7. 测试

![img](file:///C:\Users\28123\AppData\Local\Temp\QQ_1780146387208.png)



馒头：卧底词语      面包：平民词语   早餐都会吃，白色的，圆圆的



馒头：   Agent：他当前所分配到词语     知道每轮游戏其他玩家的描述     不知道别人的身份       也不知道卧底词语和普通词语      
