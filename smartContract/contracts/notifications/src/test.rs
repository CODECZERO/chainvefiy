#![cfg(test)]
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, String};

use crate::{Notifications, NotificationsClient};

#[test]
fn test_send_get_list() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, Notifications);
    let client = NotificationsClient::new(&env, &contract_id);

    client.initialize();

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let message = String::from_str(&env, "Hello");

    let id = client.send(&sender, &recipient, &message);
    assert_eq!(id, 1);

    let notif = client.get(&id).unwrap();
    assert_eq!(notif.id, 1);
    assert_eq!(notif.sender, sender);
    assert_eq!(notif.recipient, recipient);
    assert_eq!(notif.message, message);

    let list = client.list_by_recipient(&recipient, &10);
    assert_eq!(list.len(), 1);
    assert_eq!(list.get(0).unwrap().id, 1);

    assert_eq!(client.count(), 1);
}
