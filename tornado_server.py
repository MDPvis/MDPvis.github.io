from tornado.wsgi import WSGIContainer
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from flask_server import app
import sys

http_server = HTTPServer(WSGIContainer(app))
# There is an optional parameter for selecting between multiple domains in the
# domain bridge
if len(sys.argv) > 2:
    domain = sys.argv[2]
http_server.listen(5000)
IOLoop.instance().start()
