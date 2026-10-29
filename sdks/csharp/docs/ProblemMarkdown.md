# LunaCsUil.Model.ProblemMarkdown

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Markdown** | **string** | Problem statement as GitHub-flavoured markdown. Figures appear as image links whose target is a placeholder, e.g. &#x60;![Figure 1](uil-cs-api-figure:1)&#x60;; look the placeholder up in &#x60;images&#x60; to get the URL. | 
**Images** | **Dictionary&lt;string, string&gt;** | Figure placeholder → current image URL. Resolve placeholders at render time rather than caching URLs, since they change if storage moves. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)

