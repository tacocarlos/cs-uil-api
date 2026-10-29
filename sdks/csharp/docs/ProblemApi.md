# LunaCsUil.Api.ProblemApi

All URIs are relative to *https://api.lunaghs.dev*

| Method | HTTP request | Description |
|--------|--------------|-------------|
| [**GetAllProblems**](ProblemApi.md#getallproblems) | **GET** /api/problems | Returns minimal data for all problems, or up to a limit if specified |
| [**GetProblemById**](ProblemApi.md#getproblembyid) | **GET** /api/problems/{id} | Get all problem data by id |
| [**GetProblemMarkdownById**](ProblemApi.md#getproblemmarkdownbyid) | **GET** /api/problems/{id}/markdown | Get problem markdown by id |

<a id="getallproblems"></a>
# **GetAllProblems**
> List&lt;ShortProblem&gt; GetAllProblems (int? limit = null, int? offset = null)

Returns minimal data for all problems, or up to a limit if specified

Returns the id, competition id, name, and problem number for all problems. If a limit or offset are provided, then they are used.

### Example
```csharp
using System.Collections.Generic;
using System.Diagnostics;
using System.Net.Http;
using LunaCsUil.Api;
using LunaCsUil.Client;
using LunaCsUil.Model;

namespace Example
{
    public class GetAllProblemsExample
    {
        public static void Main()
        {
            Configuration config = new Configuration();
            config.BasePath = "https://api.lunaghs.dev";
            // create instances of HttpClient, HttpClientHandler to be reused later with different Api classes
            HttpClient httpClient = new HttpClient();
            HttpClientHandler httpClientHandler = new HttpClientHandler();
            var apiInstance = new ProblemApi(httpClient, config, httpClientHandler);
            var limit = 56;  // int? |  (optional) 
            var offset = 56;  // int? |  (optional) 

            try
            {
                // Returns minimal data for all problems, or up to a limit if specified
                List<ShortProblem> result = apiInstance.GetAllProblems(limit, offset);
                Debug.WriteLine(result);
            }
            catch (ApiException  e)
            {
                Debug.Print("Exception when calling ProblemApi.GetAllProblems: " + e.Message);
                Debug.Print("Status Code: " + e.ErrorCode);
                Debug.Print(e.StackTrace);
            }
        }
    }
}
```

#### Using the GetAllProblemsWithHttpInfo variant
This returns an ApiResponse object which contains the response data, status code and headers.

```csharp
try
{
    // Returns minimal data for all problems, or up to a limit if specified
    ApiResponse<List<ShortProblem>> response = apiInstance.GetAllProblemsWithHttpInfo(limit, offset);
    Debug.Write("Status Code: " + response.StatusCode);
    Debug.Write("Response Headers: " + response.Headers);
    Debug.Write("Response Body: " + response.Data);
}
catch (ApiException e)
{
    Debug.Print("Exception when calling ProblemApi.GetAllProblemsWithHttpInfo: " + e.Message);
    Debug.Print("Status Code: " + e.ErrorCode);
    Debug.Print(e.StackTrace);
}
```

### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **limit** | **int?** |  | [optional]  |
| **offset** | **int?** |  | [optional]  |

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

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

<a id="getproblembyid"></a>
# **GetProblemById**
> Problem GetProblemById (int id)

Get all problem data by id

Retrieves the data for a single problem.

### Example
```csharp
using System.Collections.Generic;
using System.Diagnostics;
using System.Net.Http;
using LunaCsUil.Api;
using LunaCsUil.Client;
using LunaCsUil.Model;

namespace Example
{
    public class GetProblemByIdExample
    {
        public static void Main()
        {
            Configuration config = new Configuration();
            config.BasePath = "https://api.lunaghs.dev";
            // create instances of HttpClient, HttpClientHandler to be reused later with different Api classes
            HttpClient httpClient = new HttpClient();
            HttpClientHandler httpClientHandler = new HttpClientHandler();
            var apiInstance = new ProblemApi(httpClient, config, httpClientHandler);
            var id = 56;  // int | 

            try
            {
                // Get all problem data by id
                Problem result = apiInstance.GetProblemById(id);
                Debug.WriteLine(result);
            }
            catch (ApiException  e)
            {
                Debug.Print("Exception when calling ProblemApi.GetProblemById: " + e.Message);
                Debug.Print("Status Code: " + e.ErrorCode);
                Debug.Print(e.StackTrace);
            }
        }
    }
}
```

#### Using the GetProblemByIdWithHttpInfo variant
This returns an ApiResponse object which contains the response data, status code and headers.

```csharp
try
{
    // Get all problem data by id
    ApiResponse<Problem> response = apiInstance.GetProblemByIdWithHttpInfo(id);
    Debug.Write("Status Code: " + response.StatusCode);
    Debug.Write("Response Headers: " + response.Headers);
    Debug.Write("Response Body: " + response.Data);
}
catch (ApiException e)
{
    Debug.Print("Exception when calling ProblemApi.GetProblemByIdWithHttpInfo: " + e.Message);
    Debug.Print("Status Code: " + e.ErrorCode);
    Debug.Print(e.StackTrace);
}
```

### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **id** | **int** |  |  |

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

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

<a id="getproblemmarkdownbyid"></a>
# **GetProblemMarkdownById**
> ProblemMarkdown GetProblemMarkdownById (int id)

Get problem markdown by id

Returns the problem statement and the URLs of its figures. The markdown refers to each figure by placeholder; substitute the URL from `images` when rendering.

### Example
```csharp
using System.Collections.Generic;
using System.Diagnostics;
using System.Net.Http;
using LunaCsUil.Api;
using LunaCsUil.Client;
using LunaCsUil.Model;

namespace Example
{
    public class GetProblemMarkdownByIdExample
    {
        public static void Main()
        {
            Configuration config = new Configuration();
            config.BasePath = "https://api.lunaghs.dev";
            // create instances of HttpClient, HttpClientHandler to be reused later with different Api classes
            HttpClient httpClient = new HttpClient();
            HttpClientHandler httpClientHandler = new HttpClientHandler();
            var apiInstance = new ProblemApi(httpClient, config, httpClientHandler);
            var id = 56;  // int | 

            try
            {
                // Get problem markdown by id
                ProblemMarkdown result = apiInstance.GetProblemMarkdownById(id);
                Debug.WriteLine(result);
            }
            catch (ApiException  e)
            {
                Debug.Print("Exception when calling ProblemApi.GetProblemMarkdownById: " + e.Message);
                Debug.Print("Status Code: " + e.ErrorCode);
                Debug.Print(e.StackTrace);
            }
        }
    }
}
```

#### Using the GetProblemMarkdownByIdWithHttpInfo variant
This returns an ApiResponse object which contains the response data, status code and headers.

```csharp
try
{
    // Get problem markdown by id
    ApiResponse<ProblemMarkdown> response = apiInstance.GetProblemMarkdownByIdWithHttpInfo(id);
    Debug.Write("Status Code: " + response.StatusCode);
    Debug.Write("Response Headers: " + response.Headers);
    Debug.Write("Response Body: " + response.Data);
}
catch (ApiException e)
{
    Debug.Print("Exception when calling ProblemApi.GetProblemMarkdownByIdWithHttpInfo: " + e.Message);
    Debug.Print("Status Code: " + e.ErrorCode);
    Debug.Print(e.StackTrace);
}
```

### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **id** | **int** |  |  |

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

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

