import autoprefixer from 'autoprefixer'
import {
  resolve
} from 'path'
import webpack from 'webpack'

const VueLoaderPlugin = require('vue-loader/lib/plugin')

import option from './option.json'

export default {
  context: resolve(option.paths.src),
  devServer: {
    contentBase: resolve(option.paths.dist),
    inline: true,
    publicPath: `http://${option.server.host}:${option.server.port}/`,
    stats: {
      colors: true
    }
  },
  entry: ['webpack-hot-middleware/client?reload=true', './app.js'],
  mode: 'development',
  module: {
    rules: [{
        test: /\.(eot|mp3|otf|svg|ttf|woff(2)?)(\?[a-z0-9]+)?$/,
        use: {
          loader: 'file-loader',
          options: {
            name: '[path][hash:7].[ext]'
          }
        }
      },
      {
        test: /\.(jpeg|jpg|png)$/,
        oneOf: [{
            test: /\/favicon/,
            use: {
              loader: 'file-loader',
              options: {
                name: '[path][name].[ext]'
              }
            }
          },
          {
            use: {
              loader: 'url-loader',
              options: {
                limit: 8192
              }
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: 'css-loader'
      },
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.pug$/,
        oneOf: [{
            resourceQuery: /^\?vue/,
            use: ['pug-plain-loader']
          },
          {
            use: [{
                loader: 'file-loader',
                options: {
                  name: '[name].html'
                }
              },
              {
                loader: 'extract-loader'
              },
              {
                loader: 'html-loader'
              },
              {
                loader: 'pug-plain-loader',
                options: {
                  exports: false
                }
              }
            ]
          }
        ]
      },
      {
        test: /\.sass$/,
        use: [{
            loader: 'vue-style-loader'
          },
          {
            loader: 'css-loader'
          },
          {
            loader: 'postcss-loader',
            options: {
              plugins: [autoprefixer]
            }
          },
          {
            loader: 'sass-loader',
            options: {
              indentedSyntax: true
            }
          },
          {
            loader: 'sass-resources-loader',
            options: {
              resources: resolve(`${option.paths.src}/util.sass`)
            }
          }
        ]
      },
      {
        test: /\.vue$/,
        use: 'vue-loader'
      }
    ]
  },
  output: {
    filename: 'app.js'
  },
  plugins: [
    new VueLoaderPlugin(),
    new webpack.HotModuleReplacementPlugin()
  ]
}