

# ProblemMarkdown


## Properties

| Name | Type | Description | Notes |
|------------ | ------------- | ------------- | -------------|
|**markdown** | **String** | Problem statement as GitHub-flavoured markdown. Figures appear as image links whose target is a placeholder, e.g. &#x60;![Figure 1](uil-cs-api-figure:1)&#x60;; look the placeholder up in &#x60;images&#x60; to get the URL. |  |
|**images** | **Map&lt;String, String&gt;** | Figure placeholder → current image URL. Resolve placeholders at render time rather than caching URLs, since they change if storage moves. |  |



