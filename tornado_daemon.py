#!/usr/bin/env python
 
import sys
from daemon import Daemon
import commands
 
class MDPvisDaemon(Daemon):
        def run(self):
                from tornado.wsgi import WSGIContainer
                from tornado.httpserver import HTTPServer
                from tornado.ioloop import IOLoop
                from flask_server import app

                http_server = HTTPServer(WSGIContainer(app))
                http_server.listen(5000)
                IOLoop.instance().start()

if __name__ == "__main__":
        daemon = MDPvisDaemon('/tmp/daemon-example.pid')
        if len(sys.argv) == 2:
                if 'start' == sys.argv[1]:
                        daemon.start()
                elif 'stop' == sys.argv[1]:
                        daemon.stop()
                elif 'restart' == sys.argv[1]:
                        daemon.restart()
                else:
                        print "Unknown command"
                        sys.exit(2)
                sys.exit(0)
        else:
                print "usage: %s start|stop|restart" % sys.argv[0]
                sys.exit(2)