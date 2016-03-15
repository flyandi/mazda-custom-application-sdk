## Understanding Lifecyles

Lifecyles are an integral part of your application and are executed at different point of the applications lifetime.

#### lifecyle ```created```

Executed when your application is initialized for the first time. Usually you add your DOM elements here. 

Example:
```javascript

  created: function() {

    this.label = $("<label/>").html("Hello World").appendTo(this.canvas);

  },
```

#### lifecyle ```focused```

Executed when your application receives the focus, e.g. the user has selected your application from the Menu or the application regains focus after the user hits the ```back``` button.

Example:
```javascript

  focused: function() {

    this.label.html("Got the focus");

  }
```

#### lifecyle ```lost```

Executed when the application loses the focus.

Example:
```javascript

  lost: function() {

    this.lable.html("");

  }
```


