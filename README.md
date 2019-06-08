**Update POI location in database**

```
mutation {
  update_pois(where: {
   	id: {
      _eq: <POI_ID>
    }
  }
  _set: {
    location: {
      type: "Point",
      coordinates: [40.632206, 22.940755]
    }
  }) {
    returning {
      location
    }
  }
}
```
