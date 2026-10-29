# luna_cs_uil.CompetitionApi

All URIs are relative to *https://api.lunaghs.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**get_all_competitions**](CompetitionApi.md#get_all_competitions) | **GET** /api/competition | Returns a list of all competitions
[**get_competition_by_id**](CompetitionApi.md#get_competition_by_id) | **GET** /api/competition/{id} | Get competition data
[**get_competition_problems**](CompetitionApi.md#get_competition_problems) | **GET** /api/competition/{id}/problems | Returns all problems for a given competition


# **get_all_competitions**
> List[Competition] get_all_competitions(limit=limit, offset=offset)

Returns a list of all competitions

### Example


```python
import luna_cs_uil
from luna_cs_uil.models.competition import Competition
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
    api_instance = luna_cs_uil.CompetitionApi(api_client)
    limit = 56 # int |  (optional)
    offset = 56 # int |  (optional)

    try:
        # Returns a list of all competitions
        api_response = api_instance.get_all_competitions(limit=limit, offset=offset)
        print("The response of CompetitionApi->get_all_competitions:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling CompetitionApi->get_all_competitions: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **int**|  | [optional] 
 **offset** | **int**|  | [optional] 

### Return type

[**List[Competition]**](Competition.md)

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

# **get_competition_by_id**
> Competition get_competition_by_id(id)

Get competition data

### Example


```python
import luna_cs_uil
from luna_cs_uil.models.competition import Competition
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
    api_instance = luna_cs_uil.CompetitionApi(api_client)
    id = 56 # int | 

    try:
        # Get competition data
        api_response = api_instance.get_competition_by_id(id)
        print("The response of CompetitionApi->get_competition_by_id:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling CompetitionApi->get_competition_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**|  | 

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
**200** | Response for status 200 |  -  |
**404** | Response for status 404 |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_competition_problems**
> List[Problem] get_competition_problems(id)

Returns all problems for a given competition

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
    api_instance = luna_cs_uil.CompetitionApi(api_client)
    id = 56 # int | 

    try:
        # Returns all problems for a given competition
        api_response = api_instance.get_competition_problems(id)
        print("The response of CompetitionApi->get_competition_problems:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling CompetitionApi->get_competition_problems: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**|  | 

### Return type

[**List[Problem]**](Problem.md)

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

