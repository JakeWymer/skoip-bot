import sqlize from "sequelize";
import db from "../index.js";
const { DataTypes } = sqlize;

const Server = db.define(
  `server`,
  {
    server_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sheets_id: {
      type: DataTypes.STRING,
    },
    skoipy_api_key: {
      type: DataTypes.STRING,
    }
  },
  {
    tableName: `server_config`,
  }
);

Server.sync({ alter: true });

export default Server;
