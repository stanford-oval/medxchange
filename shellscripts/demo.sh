tmux kill-session -t ETH
sleep 1s
tmux kill-session -t MedX
sleep 1s
echo "Waiting for ETH start"
tmux new -d -s ETH 'sh runETH.sh'
sleep 10s
node ../contracts/deploy-contract.js
sleep 5s
rm ../storages/*.sqlite3
sleep 1s
echo "Waiting for MedX start"
tmux new -d -s MedX yarn start
sleep 10s
yarn run demo
echo "Demo environment prepared"
