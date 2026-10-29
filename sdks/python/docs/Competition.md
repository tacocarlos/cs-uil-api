# Competition


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **int** |  | 
**created_at** | **datetime** |  | 
**updated_at** | **datetime** |  | 
**level** | **str** |  | 
**year** | **int** |  | 
**student_packet_url** | **str** |  | 
**data_zip_url** | **str** |  | 

## Example

```python
from luna_cs_uil.models.competition import Competition

# TODO update the JSON string below
json = "{}"
# create an instance of Competition from a JSON string
competition_instance = Competition.from_json(json)
# print the JSON string representation of the object
print(Competition.to_json())

# convert the object into a dict
competition_dict = competition_instance.to_dict()
# create an instance of Competition from a dict
competition_from_dict = Competition.from_dict(competition_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


