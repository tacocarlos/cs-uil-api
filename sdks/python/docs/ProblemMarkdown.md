# ProblemMarkdown


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**markdown** | **str** | Problem statement as GitHub-flavoured markdown. Figures appear as image links whose target is a placeholder, e.g. &#x60;![Figure 1](uil-cs-api-figure:1)&#x60;; look the placeholder up in &#x60;images&#x60; to get the URL. | 
**images** | **Dict[str, str]** | Figure placeholder → current image URL. Resolve placeholders at render time rather than caching URLs, since they change if storage moves. | 

## Example

```python
from luna_cs_uil.models.problem_markdown import ProblemMarkdown

# TODO update the JSON string below
json = "{}"
# create an instance of ProblemMarkdown from a JSON string
problem_markdown_instance = ProblemMarkdown.from_json(json)
# print the JSON string representation of the object
print(ProblemMarkdown.to_json())

# convert the object into a dict
problem_markdown_dict = problem_markdown_instance.to_dict()
# create an instance of ProblemMarkdown from a dict
problem_markdown_from_dict = ProblemMarkdown.from_dict(problem_markdown_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


