# luna_cs_uil.MetaApi

All URIs are relative to *https://api.lunaghs.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**get_version**](MetaApi.md#get_version) | **GET** /api/version | Returns the API version


# **get_version**
> str get_version()

Returns the API version

### Example


```python
import luna_cs_uil
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
    api_instance = luna_cs_uil.MetaApi(api_client)

    try:
        # Returns the API version
        api_response = api_instance.get_version()
        print("The response of MetaApi->get_version:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling MetaApi->get_version: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

**str**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/plain

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Response for status 200 |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

