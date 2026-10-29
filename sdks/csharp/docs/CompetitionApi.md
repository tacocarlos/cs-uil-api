# LunaCsUil.Api.CompetitionApi

All URIs are relative to *https://api.lunaghs.dev*

| Method | HTTP request | Description |
|--------|--------------|-------------|
| [**GetAllCompetitions**](CompetitionApi.md#getallcompetitions) | **GET** /api/competition | Returns a list of all competitions |
| [**GetCompetitionById**](CompetitionApi.md#getcompetitionbyid) | **GET** /api/competition/{id} | Get competition data |
| [**GetCompetitionProblems**](CompetitionApi.md#getcompetitionproblems) | **GET** /api/competition/{id}/problems | Returns all problems for a given competition |

<a id="getallcompetitions"></a>
# **GetAllCompetitions**
> List&lt;Competition&gt; GetAllCompetitions (int? limit = null, int? offset = null)

Returns a list of all competitions

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
    public class GetAllCompetitionsExample
    {
        public static void Main()
        {
            Configuration config = new Configuration();
            config.BasePath = "https://api.lunaghs.dev";
            // create instances of HttpClient, HttpClientHandler to be reused later with different Api classes
            HttpClient httpClient = new HttpClient();
            HttpClientHandler httpClientHandler = new HttpClientHandler();
            var apiInstance = new CompetitionApi(httpClient, config, httpClientHandler);
            var limit = 56;  // int? |  (optional) 
            var offset = 56;  // int? |  (optional) 

            try
            {
                // Returns a list of all competitions
                List<Competition> result = apiInstance.GetAllCompetitions(limit, offset);
                Debug.WriteLine(result);
            }
            catch (ApiException  e)
            {
                Debug.Print("Exception when calling CompetitionApi.GetAllCompetitions: " + e.Message);
                Debug.Print("Status Code: " + e.ErrorCode);
                Debug.Print(e.StackTrace);
            }
        }
    }
}
```

#### Using the GetAllCompetitionsWithHttpInfo variant
This returns an ApiResponse object which contains the response data, status code and headers.

```csharp
try
{
    // Returns a list of all competitions
    ApiResponse<List<Competition>> response = apiInstance.GetAllCompetitionsWithHttpInfo(limit, offset);
    Debug.Write("Status Code: " + response.StatusCode);
    Debug.Write("Response Headers: " + response.Headers);
    Debug.Write("Response Body: " + response.Data);
}
catch (ApiException e)
{
    Debug.Print("Exception when calling CompetitionApi.GetAllCompetitionsWithHttpInfo: " + e.Message);
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

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

<a id="getcompetitionbyid"></a>
# **GetCompetitionById**
> Competition GetCompetitionById (int id)

Get competition data

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
    public class GetCompetitionByIdExample
    {
        public static void Main()
        {
            Configuration config = new Configuration();
            config.BasePath = "https://api.lunaghs.dev";
            // create instances of HttpClient, HttpClientHandler to be reused later with different Api classes
            HttpClient httpClient = new HttpClient();
            HttpClientHandler httpClientHandler = new HttpClientHandler();
            var apiInstance = new CompetitionApi(httpClient, config, httpClientHandler);
            var id = 56;  // int | 

            try
            {
                // Get competition data
                Competition result = apiInstance.GetCompetitionById(id);
                Debug.WriteLine(result);
            }
            catch (ApiException  e)
            {
                Debug.Print("Exception when calling CompetitionApi.GetCompetitionById: " + e.Message);
                Debug.Print("Status Code: " + e.ErrorCode);
                Debug.Print(e.StackTrace);
            }
        }
    }
}
```

#### Using the GetCompetitionByIdWithHttpInfo variant
This returns an ApiResponse object which contains the response data, status code and headers.

```csharp
try
{
    // Get competition data
    ApiResponse<Competition> response = apiInstance.GetCompetitionByIdWithHttpInfo(id);
    Debug.Write("Status Code: " + response.StatusCode);
    Debug.Write("Response Headers: " + response.Headers);
    Debug.Write("Response Body: " + response.Data);
}
catch (ApiException e)
{
    Debug.Print("Exception when calling CompetitionApi.GetCompetitionByIdWithHttpInfo: " + e.Message);
    Debug.Print("Status Code: " + e.ErrorCode);
    Debug.Print(e.StackTrace);
}
```

### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **id** | **int** |  |  |

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

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

<a id="getcompetitionproblems"></a>
# **GetCompetitionProblems**
> List&lt;Problem&gt; GetCompetitionProblems (int id)

Returns all problems for a given competition

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
    public class GetCompetitionProblemsExample
    {
        public static void Main()
        {
            Configuration config = new Configuration();
            config.BasePath = "https://api.lunaghs.dev";
            // create instances of HttpClient, HttpClientHandler to be reused later with different Api classes
            HttpClient httpClient = new HttpClient();
            HttpClientHandler httpClientHandler = new HttpClientHandler();
            var apiInstance = new CompetitionApi(httpClient, config, httpClientHandler);
            var id = 56;  // int | 

            try
            {
                // Returns all problems for a given competition
                List<Problem> result = apiInstance.GetCompetitionProblems(id);
                Debug.WriteLine(result);
            }
            catch (ApiException  e)
            {
                Debug.Print("Exception when calling CompetitionApi.GetCompetitionProblems: " + e.Message);
                Debug.Print("Status Code: " + e.ErrorCode);
                Debug.Print(e.StackTrace);
            }
        }
    }
}
```

#### Using the GetCompetitionProblemsWithHttpInfo variant
This returns an ApiResponse object which contains the response data, status code and headers.

```csharp
try
{
    // Returns all problems for a given competition
    ApiResponse<List<Problem>> response = apiInstance.GetCompetitionProblemsWithHttpInfo(id);
    Debug.Write("Status Code: " + response.StatusCode);
    Debug.Write("Response Headers: " + response.Headers);
    Debug.Write("Response Body: " + response.Data);
}
catch (ApiException e)
{
    Debug.Print("Exception when calling CompetitionApi.GetCompetitionProblemsWithHttpInfo: " + e.Message);
    Debug.Print("Status Code: " + e.ErrorCode);
    Debug.Print(e.StackTrace);
}
```

### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **id** | **int** |  |  |

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

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

