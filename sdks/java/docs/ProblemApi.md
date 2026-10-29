# ProblemApi

All URIs are relative to *https://api.lunaghs.dev*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getAllProblems**](ProblemApi.md#getAllProblems) | **GET** /api/problems | Returns minimal data for all problems, or up to a limit if specified |
| [**getAllProblemsWithHttpInfo**](ProblemApi.md#getAllProblemsWithHttpInfo) | **GET** /api/problems | Returns minimal data for all problems, or up to a limit if specified |
| [**getProblemById**](ProblemApi.md#getProblemById) | **GET** /api/problems/{id} | Get all problem data by id |
| [**getProblemByIdWithHttpInfo**](ProblemApi.md#getProblemByIdWithHttpInfo) | **GET** /api/problems/{id} | Get all problem data by id |
| [**getProblemMarkdownById**](ProblemApi.md#getProblemMarkdownById) | **GET** /api/problems/{id}/markdown | Get problem markdown by id |
| [**getProblemMarkdownByIdWithHttpInfo**](ProblemApi.md#getProblemMarkdownByIdWithHttpInfo) | **GET** /api/problems/{id}/markdown | Get problem markdown by id |



## getAllProblems

> List<ShortProblem> getAllProblems(limit, offset)

Returns minimal data for all problems, or up to a limit if specified

Returns the id, competition id, name, and problem number for all problems. If a limit or offset are provided, then they are used.

### Example

```java
// Import classes:
import io.github.tacocarlos.lunacsuil.ApiClient;
import io.github.tacocarlos.lunacsuil.ApiException;
import io.github.tacocarlos.lunacsuil.Configuration;
import io.github.tacocarlos.lunacsuil.models.*;
import io.github.tacocarlos.lunacsuil.api.ProblemApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://api.lunaghs.dev");

        ProblemApi apiInstance = new ProblemApi(defaultClient);
        Integer limit = 56; // Integer | 
        Integer offset = 56; // Integer | 
        try {
            List<ShortProblem> result = apiInstance.getAllProblems(limit, offset);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling ProblemApi#getAllProblems");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Reason: " + e.getResponseBody());
            System.err.println("Response headers: " + e.getResponseHeaders());
            e.printStackTrace();
        }
    }
}
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **limit** | **Integer**|  | [optional] |
| **offset** | **Integer**|  | [optional] |

### Return type

[**List&lt;ShortProblem&gt;**](ShortProblem.md)


### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Response for status 200 |  -  |

## getAllProblemsWithHttpInfo

> ApiResponse<List<ShortProblem>> getAllProblemsWithHttpInfo(limit, offset)

Returns minimal data for all problems, or up to a limit if specified

Returns the id, competition id, name, and problem number for all problems. If a limit or offset are provided, then they are used.

### Example

```java
// Import classes:
import io.github.tacocarlos.lunacsuil.ApiClient;
import io.github.tacocarlos.lunacsuil.ApiException;
import io.github.tacocarlos.lunacsuil.ApiResponse;
import io.github.tacocarlos.lunacsuil.Configuration;
import io.github.tacocarlos.lunacsuil.models.*;
import io.github.tacocarlos.lunacsuil.api.ProblemApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://api.lunaghs.dev");

        ProblemApi apiInstance = new ProblemApi(defaultClient);
        Integer limit = 56; // Integer | 
        Integer offset = 56; // Integer | 
        try {
            ApiResponse<List<ShortProblem>> response = apiInstance.getAllProblemsWithHttpInfo(limit, offset);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling ProblemApi#getAllProblems");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Response headers: " + e.getResponseHeaders());
            System.err.println("Reason: " + e.getResponseBody());
            e.printStackTrace();
        }
    }
}
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **limit** | **Integer**|  | [optional] |
| **offset** | **Integer**|  | [optional] |

### Return type

ApiResponse<[**List&lt;ShortProblem&gt;**](ShortProblem.md)>


### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Response for status 200 |  -  |


## getProblemById

> Problem getProblemById(id)

Get all problem data by id

Retrieves the data for a single problem.

### Example

```java
// Import classes:
import io.github.tacocarlos.lunacsuil.ApiClient;
import io.github.tacocarlos.lunacsuil.ApiException;
import io.github.tacocarlos.lunacsuil.Configuration;
import io.github.tacocarlos.lunacsuil.models.*;
import io.github.tacocarlos.lunacsuil.api.ProblemApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://api.lunaghs.dev");

        ProblemApi apiInstance = new ProblemApi(defaultClient);
        Integer id = 56; // Integer | 
        try {
            Problem result = apiInstance.getProblemById(id);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling ProblemApi#getProblemById");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Reason: " + e.getResponseBody());
            System.err.println("Response headers: " + e.getResponseHeaders());
            e.printStackTrace();
        }
    }
}
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | **Integer**|  | |

### Return type

[**Problem**](Problem.md)


### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Response for status 200 |  -  |
| **404** | Response for status 404 |  -  |

## getProblemByIdWithHttpInfo

> ApiResponse<Problem> getProblemByIdWithHttpInfo(id)

Get all problem data by id

Retrieves the data for a single problem.

### Example

```java
// Import classes:
import io.github.tacocarlos.lunacsuil.ApiClient;
import io.github.tacocarlos.lunacsuil.ApiException;
import io.github.tacocarlos.lunacsuil.ApiResponse;
import io.github.tacocarlos.lunacsuil.Configuration;
import io.github.tacocarlos.lunacsuil.models.*;
import io.github.tacocarlos.lunacsuil.api.ProblemApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://api.lunaghs.dev");

        ProblemApi apiInstance = new ProblemApi(defaultClient);
        Integer id = 56; // Integer | 
        try {
            ApiResponse<Problem> response = apiInstance.getProblemByIdWithHttpInfo(id);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling ProblemApi#getProblemById");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Response headers: " + e.getResponseHeaders());
            System.err.println("Reason: " + e.getResponseBody());
            e.printStackTrace();
        }
    }
}
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | **Integer**|  | |

### Return type

ApiResponse<[**Problem**](Problem.md)>


### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Response for status 200 |  -  |
| **404** | Response for status 404 |  -  |


## getProblemMarkdownById

> ProblemMarkdown getProblemMarkdownById(id)

Get problem markdown by id

Returns the problem statement and the URLs of its figures. The markdown refers to each figure by placeholder; substitute the URL from &#x60;images&#x60; when rendering.

### Example

```java
// Import classes:
import io.github.tacocarlos.lunacsuil.ApiClient;
import io.github.tacocarlos.lunacsuil.ApiException;
import io.github.tacocarlos.lunacsuil.Configuration;
import io.github.tacocarlos.lunacsuil.models.*;
import io.github.tacocarlos.lunacsuil.api.ProblemApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://api.lunaghs.dev");

        ProblemApi apiInstance = new ProblemApi(defaultClient);
        Integer id = 56; // Integer | 
        try {
            ProblemMarkdown result = apiInstance.getProblemMarkdownById(id);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling ProblemApi#getProblemMarkdownById");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Reason: " + e.getResponseBody());
            System.err.println("Response headers: " + e.getResponseHeaders());
            e.printStackTrace();
        }
    }
}
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | **Integer**|  | |

### Return type

[**ProblemMarkdown**](ProblemMarkdown.md)


### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Response for status 200 |  -  |
| **404** | Response for status 404 |  -  |

## getProblemMarkdownByIdWithHttpInfo

> ApiResponse<ProblemMarkdown> getProblemMarkdownByIdWithHttpInfo(id)

Get problem markdown by id

Returns the problem statement and the URLs of its figures. The markdown refers to each figure by placeholder; substitute the URL from &#x60;images&#x60; when rendering.

### Example

```java
// Import classes:
import io.github.tacocarlos.lunacsuil.ApiClient;
import io.github.tacocarlos.lunacsuil.ApiException;
import io.github.tacocarlos.lunacsuil.ApiResponse;
import io.github.tacocarlos.lunacsuil.Configuration;
import io.github.tacocarlos.lunacsuil.models.*;
import io.github.tacocarlos.lunacsuil.api.ProblemApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://api.lunaghs.dev");

        ProblemApi apiInstance = new ProblemApi(defaultClient);
        Integer id = 56; // Integer | 
        try {
            ApiResponse<ProblemMarkdown> response = apiInstance.getProblemMarkdownByIdWithHttpInfo(id);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling ProblemApi#getProblemMarkdownById");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Response headers: " + e.getResponseHeaders());
            System.err.println("Reason: " + e.getResponseBody());
            e.printStackTrace();
        }
    }
}
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | **Integer**|  | |

### Return type

ApiResponse<[**ProblemMarkdown**](ProblemMarkdown.md)>


### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Response for status 200 |  -  |
| **404** | Response for status 404 |  -  |

