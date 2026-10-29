# MetaApi

All URIs are relative to *https://api.lunaghs.dev*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getVersion**](MetaApi.md#getVersion) | **GET** /api/version | Returns the API version |
| [**getVersionWithHttpInfo**](MetaApi.md#getVersionWithHttpInfo) | **GET** /api/version | Returns the API version |



## getVersion

> String getVersion()

Returns the API version

### Example

```java
// Import classes:
import io.github.tacocarlos.lunacsuil.ApiClient;
import io.github.tacocarlos.lunacsuil.ApiException;
import io.github.tacocarlos.lunacsuil.Configuration;
import io.github.tacocarlos.lunacsuil.models.*;
import io.github.tacocarlos.lunacsuil.api.MetaApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://api.lunaghs.dev");

        MetaApi apiInstance = new MetaApi(defaultClient);
        try {
            String result = apiInstance.getVersion();
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling MetaApi#getVersion");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Reason: " + e.getResponseBody());
            System.err.println("Response headers: " + e.getResponseHeaders());
            e.printStackTrace();
        }
    }
}
```

### Parameters

This endpoint does not need any parameter.

### Return type

**String**


### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: text/plain

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Response for status 200 |  -  |

## getVersionWithHttpInfo

> ApiResponse<String> getVersionWithHttpInfo()

Returns the API version

### Example

```java
// Import classes:
import io.github.tacocarlos.lunacsuil.ApiClient;
import io.github.tacocarlos.lunacsuil.ApiException;
import io.github.tacocarlos.lunacsuil.ApiResponse;
import io.github.tacocarlos.lunacsuil.Configuration;
import io.github.tacocarlos.lunacsuil.models.*;
import io.github.tacocarlos.lunacsuil.api.MetaApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://api.lunaghs.dev");

        MetaApi apiInstance = new MetaApi(defaultClient);
        try {
            ApiResponse<String> response = apiInstance.getVersionWithHttpInfo();
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling MetaApi#getVersion");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Response headers: " + e.getResponseHeaders());
            System.err.println("Reason: " + e.getResponseBody());
            e.printStackTrace();
        }
    }
}
```

### Parameters

This endpoint does not need any parameter.

### Return type

ApiResponse<**String**>


### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: text/plain

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Response for status 200 |  -  |

