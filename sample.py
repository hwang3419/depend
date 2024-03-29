from flask import Flask
from flask import jsonify
from flask import render_template
app = Flask(__name__)

@app.route('/test')
def test():
    d = {
            "nodes": [
            { "name": "firmware",               "group":  1, "class": "system" },
            { "name": "loader",                 "group":  1, "class": "system" },
            { "name": "kernel",                 "group":  1, "class": "system" },
            { "name": "systemd",                "group":  1, "class": "mount"  },
            { "name": "mount",                  "group":  2, "class": "mount"  },
            { "name": "init.scope",             "group":  1, "class": "init"   },
            { "name": "system.slice",           "group":  1, "class": "init"   },
            { "name": "system-getty.slice",     "group":  1, "class": "init"   },
            { "name": "systemd-initctl.socker", "group":  1, "class": "init"   },
            { "name": "tmp.mount",              "group":  1, "class": "init"   },
            { "name": "sys-devices",            "group":  2, "class": "init"   },
            { "name": "boot.mount",             "group":  2, "class": "mount"  },
            { "name": "boot.mount.2",           "group":  2, "class": "mount"  },
            { "name": "boot.mount.3",           "group":  2, "class": "mount"  },
            { "name": "boot.mount.4",           "group":  2, "class": "mount"  },
            { "name": "boot.mount.5",           "group":  2, "class": "mount"  }
            ],
            "links": [
            { "source":  1,  "target":  0,  "value":  1, "type": "depends" },
            { "source":  2,  "target":  1,  "value":  8, "type": "depends" },
            { "source":  3,  "target":  2,  "value":  6, "type": "depends" },
            { "source":  4,  "target":  3,  "value":  1, "type": "needs"   },
            { "source":  4,  "target":  2,  "value":  5, "type": "needs"   },
            { "source":  5,  "target":  3,  "value":  1, "type": "needs"   },
            { "source":  6,  "target":  3,  "value":  1, "type": "needs"   },
            { "source":  7,  "target":  3,  "value":  1, "type": "needs"   },
            { "source":  8,  "target":  3,  "value":  2, "type": "needs"   },
            { "source":  9,  "target":  3,  "value":  1, "type": "needs"   },
            { "source": 11,  "target": 10,  "value":  1, "type": "depends" },
            { "source": 12,  "target":  3,  "value":  3, "type": "depends" },
            { "source": 13,  "target":  2,  "value":  3, "type": "depends" },
            { "source": 14,  "target":  2,  "value":  5, "type": "needs"   },
            { "source": 15,  "target":  2,  "value":  5, "type": "needs"   }
            ]
            }
    return jsonify(d)


@app.route('/home')
def index():
    return render_template('./index.html') 