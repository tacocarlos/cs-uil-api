# CompetitionApi

All URIs are relative to *https://api.lunaghs.dev*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getAllCompetitions**](CompetitionApi.md#getAllCompetitions) | **GET** /api/competition | Returns a list of all competitions |
| [**getAllCompetitionsWithHttpInfo**](CompetitionApi.md#getAllCompetitionsWithHttpInfo) | **GET** /api/competition | Returns a list of all competitions |
| [**getCompetitionById**](CompetitionApi.md#getCompetitionById) | **GET** /api/competition/{id} | Get competition data |
| [**getCompetitionByIdWithHttpInfo**](CompetitionApi.md#getCompetitionByIdWithHttpInfo) | **GET** /api/competition/{id} | Get competition data |
| [**getCompetitionProblems**](CompetitionApi.md#getCompetitionProblems) | **GET** /api/competition/{id}/problems | Returns all problems for a given competition |
| [**getCompetitionProblemsWithHttpInfo**](CompetitionApi.md#getCompetitionProblemsWithHttpInfo) | **GET** /api/competition/{id}/problems | Returns all problems for a given competition |



## getAllCompetitions

> List<Competition> getAllCompetitions(limit, offset)

Returns a list of all competitions

### Example

```java
// Import classes:
import io.github.tacocarlos.lunacsuil.ApiClient;
import io.github.tacocarlos.lunacsuil.ApiException;
import io.github.tacocarlos.lunacsuil.Configuration;
import io.github.tacocarlos.lunacsuil.models.*;
import io.github.tacocarlos.lunacsuil.api.CompetitionApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://api.lunaghs.dev");

        CompetitionApi apiInstance = new CompetitionApi(defaultClient);
        Integer limit = 56; // Integer | 
        Integer offset = 56; // Integer | 
        try {
            List<Competition> result = apiInstance.getAllCompetitions(limit, offset);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling CompetitionApi#getAllCompetitions");
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

[**List&lt;Competition&gt;**](Competition.md)


### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Response for status 200 |  -  |

## getAllCompetitionsWithHttpInfo

> ApiResponse<List<Competition>> getAllCompetitionsWithHttpInfo(limit, offset)

Returns a list of all competitions

### Example

```java
// Import classes:
import io.github.tacocarlos.lunacsuil.ApiClient;
import io.github.tacocarlos.lunacsuil.ApiException;
import io.github.tacocarlos.lunacsuil.ApiResponse;
import io.github.tacocarlos.lunacsuil.Configuration;
import io.github.tacocarlos.lunacsuil.models.*;
import io.github.tacocarlos.lunacsuil.api.CompetitionApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://api.lunaghs.dev");

        CompetitionApi apiInstance = new CompetitionApi(defaultClient);
        Integer limit = 56; // Integer | 
        Integer offset = 56; // Integer | 
        try {
            ApiResponse<List<Competition>> response = apiInstance.getAllCompetitionsWithHttpInfo(limit, offset);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling CompetitionApi#getAllCompetitions");
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

ApiResponse<[**List&lt;Competition&gt;**](Competition.md)>


### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Response for status 200 |  -  |


## getCompetitionById

> Competition getCompetitionById(id)

Get competition data

### Example

```java
// Import classes:
import io.github.tacocarlos.lunacsuil.ApiClient;
import io.github.tacocarlos.lunacsuil.ApiException;
import io.github.tacocarlos.lunacsuil.Configuration;
import io.github.tacocarlos.lunacsuil.models.*;
import io.github.tacocarlos.lunacsuil.api.CompetitionApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://api.lunaghs.dev");

        CompetitionApi apiInstance = new CompetitionApi(defaultClient);
        Integer id = 56; // Integer | 
        try {
            Competition result = apiInstance.getCompetitionById(id);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling CompetitionApi#getCompetitionById");
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

[**Competition**](Competition.md)


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

## getCompetitionByIdWithHttpInfo

> ApiResponse<Competition> getCompetitionByIdWithHttpInfo(id)

Get competition data

### Example

```java
// Import classes:
import io.github.tacocarlos.lunacsuil.ApiClient;
import io.github.tacocarlos.lunacsuil.ApiException;
import io.github.tacocarlos.lunacsuil.ApiResponse;
import io.github.tacocarlos.lunacsuil.Configuration;
import io.github.tacocarlos.lunacsuil.models.*;
import io.github.tacocarlos.lunacsuil.api.CompetitionApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://api.lunaghs.dev");

        CompetitionApi apiInstance = new CompetitionApi(defaultClient);
        Integer id = 56; // Integer | 
        try {
            ApiResponse<Competition> response = apiInstance.getCompetitionByIdWithHttpInfo(id);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling CompetitionApi#getCompetitionById");
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

ApiResponse<[**Competition**](Competition.md)>


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


## getCompetitionProblems

> List<Problem> getCompetitionProblems(id)

Returns all problems for a given competition

### Example

```java
// Import classes:
import io.github.tacocarlos.lunacsuil.ApiClient;
import io.github.tacocarlos.lunacsuil.ApiException;
import io.github.tacocarlos.lunacsuil.Configuration;
import io.github.tacocarlos.lunacsuil.models.*;
import io.github.tacocarlos.lunacsuil.api.CompetitionApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://api.lunaghs.dev");

        CompetitionApi apiInstance = new CompetitionApi(defaultClient);
        Integer id = 56; // Integer | 
        try {
            List<Problem> result = apiInstance.getCompetitionProblems(id);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling CompetitionApi#getCompetitionProblems");
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

[**List&lt;Problem&gt;**](Problem.md)


### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Response for status 200 |  -  |

## getCompetitionProblemsWithHttpInfo

> ApiResponse<List<Problem>> getCompetitionProblemsWithHttpInfo(id)

Returns all problems for a given competition

### Example

```java
// Import classes:
import io.github.tacocarlos.lunacsuil.ApiClient;
import io.github.tacocarlos.lunacsuil.ApiException;
import io.github.tacocarlos.lunacsuil.ApiResponse;
import io.github.tacocarlos.lunacsuil.Configuration;
import io.github.tacocarlos.lunacsuil.models.*;
import io.github.tacocarlos.lunacsuil.api.CompetitionApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://api.lunaghs.dev");

        CompetitionApi apiInstance = new CompetitionApi(defaultClient);
        Integer id = 56; // Integer | 
        try {
            ApiResponse<List<Problem>> response = apiInstance.getCompetitionProblemsWithHttpInfo(id);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling CompetitionApi#getCompetitionProblems");
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

ApiResponse<[**List&lt;Problem&gt;**](Problem.md)>


### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Response for status 200 |  -  |

