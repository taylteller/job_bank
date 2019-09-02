# job_bank

This is a command-line Node application that will fetch data from an endpoint of jobs (cannot be accessed without a cookie; not included in project). 

When using the application, the user has the option of specifying which languages of jobs they want to fetch (English and/or French). There are also two separate operations the application can perform, and the user can choose one:
* **Reset**, which will wipe away the specified Elasticsearch language indices, recreate them and enter new data.
* **Update**, which will retrieve the data from the endpoint, retrieve the data from the appropriate Elasticsearch index, and compare the two. Then, for any new or updated records in the main endpoint, it will make individual endpoint calls for each relevant job's details, and insert those into Elasticsearch. It will also delete old, no longer needed records from Elasticsearch. 
