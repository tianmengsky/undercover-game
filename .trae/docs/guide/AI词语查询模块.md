# AI词语查询模块

## 一、创建词语实体类

- 词语实体类主要用于接受最终Agent返回的数据

- 创建【WordVo】实体类

  ```java
  package com.example.aiserverpro.entity.vo;
  
  import lombok.Data;
  
  // 返回前端的词语实体
  @Data
  public class WordVo {
      private String commonWord;
      private String undercoverWord;
      private String difficulty;
  }
  ```



## 二、编写业务层代码

- 创建【WordService】接口，定义业务规范

  ```java
  package com.example.aiserverpro.service;
  
  import com.example.aiserverpro.entity.vo.WordVo;
  
  public interface WordService {
      // 创建词语对业务逻辑函数
      public WordVo createWordByLevel();
  }
  ```

- 创建【WordService】实现类【WordServieImpl】实现业务逻辑

  ```java
  package com.example.aiserverpro.service.impl;
  import com.example.aiserverpro.WordServiceImpl;
  import com.example.aiserverpro.entity.vo.WordVo;
  import com.fasterxml.jackson.databind.JsonNode;
  import com.fasterxml.jackson.databind.ObjectMapper;
  import org.slf4j.Logger;
  import org.slf4j.LoggerFactory;
  import org.springframework.http.*;
  import org.springframework.stereotype.Service;
  import org.springframework.web.client.RestClientException;
  import org.springframework.web.client.RestTemplate;
  
  import java.util.HashMap;
  import java.util.Map;
  import com.example.aiserverpro.service.WordService;
  
  @Service
  public class WordServieImpl implements WordService {
      //日志对象，打印运行日志、异常信息
      private static final Logger logger = LoggerFactory.getLogger(WordServiceImpl.class);
      //Spring提供的http请求工具，用来POST调用Dify开放接口
      private final RestTemplate restTemplate = new RestTemplate();
      //Jackson序列化/反序列化工具：JSON字符串<->JsonNode/实体
      private final ObjectMapper objectMapper = new ObjectMapper();
  
      //Dify Agent接口地址（blocking阻塞模式）
      private static final String AGENT_API_URL = "http://localhost/v1/chat-messages";
      //Dify应用鉴权Token
      private static final String AUTH_TOKEN = "Bearer app-aK6EzVRmMw4nFDmoyxEBc2l6";
  
      /**
       * 生成一组卧底词语，固定难度：简单
       * @return WordVo 词语封装实体：普通词、卧底词、难度；异常返回null
       */
      @Override
      public WordVo createWordByLevel() {
          logger.info("getData2接口被调用");
  
          try {
              //1.组装Dify接口请求体
              Map<String, Object> requestBody = new HashMap<>();
              //inputs：Dify应用自定义入参
              Map<String, Object> inputMap = new HashMap<>();
              inputMap.put("type", "词语生成");
              requestBody.put("inputs", inputMap);
              //query：发给大模型的提示词，控制生成难度
              requestBody.put("query", "难度：简单");
              //blocking=阻塞一次性返回全量数据，非流式分片
              requestBody.put("response_mode", "blocking");
              //会话ID空：每次全新对话，不携带历史上下文
              requestBody.put("conversation_id", "");
              //用户标识，Dify用来区分调用方
              requestBody.put("user", "abc-123");
  
              logger.info("请求参数: {}", requestBody);
  
              //2.组装请求头：json格式 + 接口鉴权
              HttpHeaders headers = new HttpHeaders();
              headers.setContentType(MediaType.APPLICATION_JSON);
              headers.set("Authorization", AUTH_TOKEN);
  
              //把请求头+请求体封装为请求实体
              HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);
  
              //3.发送POST请求调用Dify接口
              ResponseEntity<String> response = restTemplate.exchange(
                      AGENT_API_URL,
                      HttpMethod.POST,
                      requestEntity,
                      String.class
              );
  
              logger.info("API响应状态码: {}", response.getStatusCode());
  
              //4.判断http状态2xx=请求成功
              if (response.getStatusCode().is2xxSuccessful()) {
                  //拿到Dify完整返回报文
                  String responseBody = response.getBody();
                  logger.info("API响应体: {}", responseBody);
  
                  //外层JSON转JsonNode，安全获取answer字段
                  JsonNode rootNode = objectMapper.readTree(responseBody);
                  //校验返回数据是否携带answer（AI输出全部内容都在answer内）
                  if (!rootNode.has("answer")) {
                      logger.error("API响应中缺少answer字段");
                      return null;
                  }
  
                  //取出answer：内容=思考文字+标签+目标{}JSON
                  String answer = rootNode.get("answer").asText();
                  logger.info("提取的answer字段值: {}", answer);
  
                  //【核心工具1】从混杂文本里剥离思考内容，只提取纯净{}JSON
                  String targetJson = extractJsonFromAnswer(answer);
                  if (targetJson == null || targetJson.isEmpty()) {
                      logger.error("无法从answer中提取有效的JSON数据");
                      return null;
                  }
                  logger.info("提取的目标JSON: {}", targetJson);
  
                  //【核心工具2】纯净JSON手动解析字段，封装到WordVo实体
                  WordVo wordVo = convertToWordVo(targetJson);
                  if (wordVo == null) {
                      logger.error("JSON转换为WordVo对象失败");
                      return null;
                  }
  
                  logger.info("转换后的WordVo对象: commonWord={}, undercoverWord={}, difficulty={}",
                          wordVo.getCommonWord(), wordVo.getUndercoverWord(), wordVo.getDifficulty());
  
                  return wordVo;
              } else {
                  //非200状态码：接口调用失败
                  logger.error("API调用失败，状态码: {}", response.getStatusCode());
                  return null;
              }
  
          } catch (RestClientException e) {
              //RestTemplate网络异常：连接失败、超时、地址错误
              logger.error("网络请求异常: {}", e.getMessage(), e);
              return null;
          } catch (Exception e) {
              //其余所有异常：json解析、字段缺失、格式错误等
              logger.error("处理响应异常: {}", e.getMessage(), e);
              return null;
          }
      }
  
      /**
       * 工具方法：剥离AI思考内容，从answer文本中截取有效JSON字符串
       * 两种兼容场景：
       * 1、AI用```包裹json：```json {xxx}```
       * 2、无标记，杂乱文字+{xxx}，自动截取第一个{到最后一个}
       * @param answer Dify返回的原始answer字符串（含think思考文字）
       * @return 干净标准JSON字符串
       */
      private String extractJsonFromAnswer(String answer) {
          //空值直接返回
          if (answer == null || answer.trim().isEmpty()) {
              return null;
          }
          //去除首尾多余换行空格
          String trimmedAnswer = answer.trim();
  
          //场景1：处理markdown代码块包裹格式 ```json {} ```
          if (trimmedAnswer.startsWith("```")) {
              //找到末尾```下标
              int endIndex = trimmedAnswer.lastIndexOf("```");
              if (endIndex > 3) {
                  //截取两个```中间内容
                  String content = trimmedAnswer.substring(3, endIndex).trim();
                  //去掉开头的json标识字符串
                  if (content.toLowerCase().startsWith("json")) {
                      content = content.substring(4).trim();
                  }
                  return content;
              }
          }
  
          //场景2：没有代码标记，自动查找第一个{ 和最后一个}，中间即为JSON
          int jsonStart = trimmedAnswer.indexOf("{");
          int jsonEnd = trimmedAnswer.lastIndexOf("}");
          if (jsonStart != -1 && jsonEnd != -1 && jsonEnd > jsonStart) {
              return trimmedAnswer.substring(jsonStart, jsonEnd + 1);
          }
  
          //兜底：找不到{}原样返回
          return trimmedAnswer;
      }
  
      /**
       * 工具方法：纯JSON字符串→WordVo实体对象
       * 手动解析字段，做字段非空校验，避免jackson字段不匹配报错
       * @param jsonStr 清洗后的纯净json串
       * @return 封装好的词语实体，字段缺失/空值返回null
       */
      private WordVo convertToWordVo(String jsonStr) {
          try {
              //json字符串转为节点对象，方便逐个取字段
              JsonNode jsonNode = objectMapper.readTree(jsonStr);
  
              //校验三个必填字段是否存在
              if (!jsonNode.has("common_word") || !jsonNode.has("undercover_word") || !jsonNode.has("difficulty")) {
                  logger.error("JSON结构不完整，缺少必要字段");
                  return null;
              }
  
              //逐个取出value
              String commonWord = jsonNode.get("common_word").asText();
              String undercoverWord = jsonNode.get("undercover_word").asText();
              String difficulty = jsonNode.get("difficulty").asText();
  
              //字段内容非空校验
              if (commonWord == null || commonWord.isEmpty() ||
                      undercoverWord == null || undercoverWord.isEmpty() ||
                      difficulty == null || difficulty.isEmpty()) {
                  logger.error("JSON字段值为空");
                  return null;
              }
  
              //赋值封装实体
              WordVo wordVo = new WordVo();
              wordVo.setCommonWord(commonWord);
              wordVo.setUndercoverWord(undercoverWord);
              wordVo.setDifficulty(difficulty);
  
              return wordVo;
  
          } catch (Exception e) {
              //json格式错误、解析失败捕获
              logger.error("JSON解析失败: {}", e.getMessage(), e);
              return null;
          }
      }
  }
  ```

## 三、编写词语AI生成控制层

### 3.1 统一响应封装

- 创建【ApiResponse】工具类

  ```java
  package com.example.aiserverpro.utils;
  import lombok.AllArgsConstructor;
  import lombok.Data;
  import lombok.NoArgsConstructor;
  
  /**
   * 统一API响应封装类
   */
  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  public class ApiResponse<T> {
      private Integer code;
      private String message;
      private T data;
  
      public static <T> ApiResponse<T> success(T data) {
          return new ApiResponse<>(200, "success", data);
      }
  
      public static <T> ApiResponse<T> success(String message, T data) {
          return new ApiResponse<>(200, message, data);
      }
  
      public static <T> ApiResponse<T> error(String message) {
          return new ApiResponse<>(500, message, null);
      }
  
      public static <T> ApiResponse<T> error(Integer code, String message) {
          return new ApiResponse<>(code, message, null);
      }
  }
  
  ```

### 3.2 创建【WordController】控制层类

```java
package com.example.aiserverpro.controller;

import com.example.aiserverpro.ApiResponse;
import com.example.aiserverpro.entity.vo.WordVo;
import com.example.aiserverpro.service.WordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin
public class WordController {
    // 创建业务层实例
    @Autowired
    private WordService wordService;

    // 创建get请求，获取词语数据
    @GetMapping("/createWordByLevel1")
    public ApiResponse WordController() {
        try {
            WordVo wordVo = wordService.createWordByLevel();
            // 封装成功响应
            return ApiResponse.success("查询成功",wordVo);
        }catch (Exception e){
            // 封装失败响应
            return ApiResponse.error("查询失败");
        }
    }
}
```











