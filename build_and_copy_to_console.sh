yarn build

DST_DIR=../zkbob-console/node_modules/zkbob-client-js

rm -rf $DST_DIR/lib $DST_DIR/src
cp -R ./src $DST_DIR
cp -R ./lib $DST_DIR
