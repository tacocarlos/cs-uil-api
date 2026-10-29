# luna_cs_uil.ProblemApi

All URIs are relative to *https://api.lunaghs.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**get_all_problems**](ProblemApi.md#get_all_problems) | **GET** /api/problems | Returns minimal data for all problems, or up to a limit if specified
[**get_problem_by_id**](ProblemApi.md#get_problem_by_id) | **GET** /api/problems/{id} | Get all problem data by id
[**get_problem_markdown_by_id**](ProblemApi.md#get_problem_markdown_by_id) | **GET** /api/problems/{id}/markdown | Get problem markdown by id


# **get_all_problems**
> List[ShortProblem] get_all_problems(limit=limit, offset=offset)

Returns minimal data for all problems, or up to a limit if specified

Returns the id, competition id, name, and problem number for all problems. If a limit or offset are provided, then they are used.

### Example


```python
import luna_cs_uil
from luna_cs_uil.models.short_problem import ShortProblem
from luna_cs_uil.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.lunaghs.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = luna_cs_uil.Configuration(
    host = "https://api.lunaghs.dev"
)


# Enter a context with an instance of the API client
with luna_cs_uil.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = luna_cs_uil.ProblemApi(api_client)
    limit = 56 # int |  (optional)
    offset = 56 # int |  (optional)

    try:
        # Returns minimal data for all problems, or up to a limit if specified
        api_response = api_instance.get_all_problems(limit=limit, offset=offset)
        print("The response of ProblemApi->get_all_problems:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ProblemApi->get_all_problems: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **int**|  | [optional] 
 **offset** | **int**|  | [optional] 

### Return type

[**List[ShortProblem]**](ShortProblem.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Response for status 200 |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_problem_by_id**
> Problem get_problem_by_id(id)

Get all problem data by id

Retrieves the data for a single problem.

### Example


```python
import luna_cs_uil
from luna_cs_uil.models.problem import Problem
from luna_cs_uil.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.lunaghs.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = luna_cs_uil.Configuration(
    host = "https://api.lunaghs.dev"
)


# Enter a context with an instance of the API client
with luna_cs_uil.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = luna_cs_uil.ProblemApi(api_client)
    id = 56 # int | 

    try:
        # Get all problem data by id
        api_response = api_instance.get_problem_by_id(id)
        print("The response of ProblemApi->get_problem_by_id:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ProblemApi->get_problem_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**|  | 

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
**200** | Response for status 200 |  -  |
**404** | Response for status 404 |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_problem_markdown_by_id**
> ProblemMarkdown get_problem_markdown_by_id(id)

Get problem markdown by id

Returns the problem statement and the URLs of its figures. The markdown refers to each figure by placeholder; substitute the URL from `images` when rendering.

### Example


```python
import luna_cs_uil
from luna_cs_uil.models.problem_markdown import ProblemMarkdown
from luna_cs_uil.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.lunaghs.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = luna_cs_uil.Configuration(
    host = "https://api.lunaghs.dev"
)


# Enter a context with an instance of the API client
with luna_cs_uil.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = luna_cs_uil.ProblemApi(api_client)
    id = 56 # int | 

    try:
        # Get problem markdown by id
        api_response = api_instance.get_problem_markdown_by_id(id)
        print("The response of ProblemApi->get_problem_markdown_by_id:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ProblemApi->get_problem_markdown_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**|  | 

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
**200** | Response for status 200 |  -  |
**404** | Response for status 404 |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

