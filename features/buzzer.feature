Feature: Buzzer features
  Test the standard features of Buzzer.mobi on different browsers

  Scenario: One player joins and presses buzzer
    Given an app instance called "host"
    And an app instance called "player"
    When "host" clicks the "create-button" button
    Then "host" should see "Nobody has joined yet" in element "admin-message"
    And "host" sould see a 4-digit game ID
    When "player" enters the game ID
    And "player" enters "player 1" in the "name-input" box
    And "player" clicks the "join-button" button
    Then "player" should see the "buzzer" element
    And "host" should see "player 1 has joined" in element "admin-message"
    When "player" buzzes
    Then "host" should see "player 1 has buzzed" in element "admin-message"
