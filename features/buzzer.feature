Feature: Buzzer features
  Test the standard features of Buzzer.mobi on different browsers

  Scenario: One player joins and presses buzzer
    Given an app instance called "host"
    And an app instance called "player"
    When "host" clicks the "create-button" button
    Then "host" should see "Nobody has joined yet" in element "player-list"
    And "host" sould see a 4-digit game ID
    When "player" enters the game ID
    And "player" enters "player 1" in the "name-input" box
    And "player" clicks the "join-button" button
    Then "player" should see the "buzzer" element
    And "host" should see "player 1 has joined" in element "admin-message"
    When "player" buzzes
    Then "host" should see "player 1 has buzzed" in element "admin-message"

  Scenario: Two players join. One player buzzes, other player cannot, reset & switch
    Given an app instance called "host"
    And an app instance called "alice"
    And an app instance called "bob"
    When "host" clicks the "create-button" button
    Then "host" sould see a 4-digit game ID
    When "alice" enters the game ID
    And "alice" enters "Alice" in the "name-input" box
    And "alice" clicks the "join-button" button
    Then "host" should see "Alice has joined" in element "admin-message"
    When "bob" enters the game ID
    And "bob" enters "Bob" in the "name-input" box
    And "bob" clicks the "join-button" button
    Then "host" should see "Bob has joined" in element "admin-message"
    When "alice" buzzes
    And "bob" buzzes
    Then "host" should see "Alice has buzzed" in element "admin-message"
    When "host" clicks the "reset-all-button" button
    Then "host" should see " " in element "admin-message"
    When "bob" buzzes
    And "alice" buzzes
    Then "host" should see "Bob has buzzed" in element "admin-message"

  Scenario: Two players join. First player to buzz gets frozen
    Given an app instance called "host"
    And an app instance called "han"
    And an app instance called "greedo"
    When "host" clicks the "create-button" button
    Then "host" sould see a 4-digit game ID
    When "han" enters the game ID
    And "han" enters "Han" in the "name-input" box
    And "han" clicks the "join-button" button
    When "greedo" enters the game ID
    And "greedo" enters "Greedo" in the "name-input" box
    And "greedo" clicks the "join-button" button
    When "han" buzzes
    And "greedo" buzzes
    Then "host" should see "Han has buzzed" in element "admin-message"
    When "host" clicks the "freeze-player-button" button
    Then "host" should see " " in element "admin-message"
    When "han" buzzes
    And "greedo" buzzes
    Then "host" should see "Greedo has buzzed" in element "admin-message"
