# RestTemplate发起客户端请求流程

# 第 1 步：常量配置

```
//1.接口地址：Dify阻塞接口
private static final String AGENT_API_URL = "http://localhost/v1/chat-messages";
//2.Dify鉴权密钥，固定在Header
private static final String AUTH_TOKEN = "Bearer app-xxx";
```

> 知识点：Bearer 空格不能丢，缺空格直接 401 鉴权失败

# 第 2 步：构建 POST 请求体 RequestBody

Dify 接口固定 5 个入参：

- inputs：自定义业务参数（type = 词语生成）
- query：发给大模型的提示词（控制难度）
- response_mode：blocking = 阻塞一次性返回（非流式）
- conversation_id：空 = 新建对话，不带历史上下文
- user：自定义用户标识

```
Map<String, Object> requestBody = new HashMap<>();
Map<String, Object> inputMap = new HashMap<>();
inputMap.put("type", "词语生成");
requestBody.put("inputs", inputMap);
requestBody.put("query", "难度：简单");
requestBody.put("response_mode", "blocking");
requestBody.put("conversation_id", "");
requestBody.put("user", "abc-123");
```

# 第 3 步：封装请求头 HttpHeaders

```
HttpHeaders headers = new HttpHeaders();
headers.setContentType(MediaType.APPLICATION_JSON); //声明body是JSON格式
headers.set("Authorization", AUTH_TOKEN); //接口身份校验
```

易错点：**后端不传 ContentType，Dify 无法解析 body，直接报错**。

# 第 4 步：HttpEntity 统一封装头 + 体

```
HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);
```

> HttpEntity 作用：RestTemplate 入参载体，把 header 和 body 打包，不用分开传参。

# 第 5 步：exchange 发送请求，接收 ResponseEntity

```
ResponseEntity<String> response = restTemplate.exchange(
        AGENT_API_URL,        //接口地址
        HttpMethod.POST,      //请求方式POST
        requestEntity,        //头+体封装对象
        String.class          //响应体用字符串接收
);
```

## ResponseEntity 三大组成

1. `response.getStatusCode()`：HTTP 状态码（200 成功、401 密钥错、404 地址错、500 服务异常）
2. `response.getBody()`：接口返回完整 JSON 字符串（Dify 外层大 JSON）
3. `response.getHeaders()`：响应头（本节课不用）

# 四、拿到响应后：后端数据解析全流程

```
Dify完整JSON字符串 → JsonNode树形解析 → 提取answer字段 → 
answer（思考文字+标签+业务JSON）→ extractJsonFromAnswer剔除思考 → 
纯净{}JSON → convertToWordVo手动解析字段 → WordVo实体
```

### 分步拆解

1. **外层 Dify 报文解析：提取 answer**

```
JsonNode rootNode = objectMapper.readTree(responseBody);
String answer = rootNode.get("answer").asText();
```

> Dify 外层字段：event、task_id、answer、metadata，我们只需要 answer，用 JsonNode 安全取值，避免字段多余报错。

1. 工具 1：extractJsonFromAnswer 剔除思考文本

   兼容 3 种 AI 返回格式：

- 格式 1：/xxx {json} → 找第一个 {、最后一个} 截取
- 格式 2：`json {xxx}` → 剔除前后 ```
- 格式 3：纯 JSON 无多余文字 → 直接返回

> 解决之前报错：首字符`/`非法 JSON，提前裁剪丢弃思考内容。

1. 工具 2：convertToWordVo 手动封装 WordVo

   不用自动反射映射，手动 get 字段，好处：

- common_word（下划线 json 字段）→ commonWord（实体属性）避免映射异常
- 字段缺失 / 空值提前校验，日志打印，方便排错