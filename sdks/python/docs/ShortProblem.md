# ShortProblem


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **int** |  | 
**competition_id** | **int** |  | 
**name** | **str** |  | 
**number** | **int** |  | 

## Example

```python
from luna_cs_uil.models.short_problem import ShortProblem

# TODO update the JSON string below
json = "{}"
# create an instance of ShortProblem from a JSON string
short_problem_instance = ShortProblem.from_json(json)
# print the JSON string representation of the object
print(ShortProblem.to_json())

# convert the object into a dict
short_problem_dict = short_problem_instance.to_dict()
# create an instance of ShortProblem from a dict
short_problem_from_dict = ShortProblem.from_dict(short_problem_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


