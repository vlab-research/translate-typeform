export IS_CI=${1}

docker-compose -f test.yaml down --remove-orphans
docker-compose -f test.yaml build main
docker-compose -f test.yaml run main
