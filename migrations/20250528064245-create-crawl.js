"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("crawl", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      timestamp: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      html: {
        type: Sequelize.TEXT("long"),
        allowNull: false,
      },
      metrics: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      cookies: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      localStorage: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      links: {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        allowNull: true,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("crawl");
  },
};
