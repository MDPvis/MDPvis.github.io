echo ""
echo "This script starts a simple Python server that will let you open MDPvis locally."
echo "Once the server starts you can visit http://localhost:8000/index.html in your browser."
echo "to quit the server you should press ctrl-c."
echo ""
echo "You should not use this server to start an MDP domain since this will only serve the visualization."
python -m SimpleHTTPServer
